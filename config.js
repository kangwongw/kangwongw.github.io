// Firebase/Firestore 클라이언트 초기화 설정
// Firebase Console에서 프로젝트 설정 정보를 가져와 입력하세요.

// Firebase 설정 정보 (Firebase Console에서 복사)
const firebaseConfig = {
  apiKey: "AIzaSyDI_xD4eNpB9mvmOxc5Lz16ntkIxxf28gk",
  authDomain: "knu-nursing.firebaseapp.com",
  projectId: "knu-nursing",
  storageBucket: "knu-nursing.firebasestorage.app",
  messagingSenderId: "797360869409",
  appId: "1:797360869409:web:2c9963bae01ac6d9e05360"
};

// Firebase 초기화 (compat 모드 사용)
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  window.db = firebase.firestore();
} else {
  console.error('Firebase SDK가 로드되지 않았습니다. HTML 파일에 Firebase SDK 스크립트를 추가하세요.');
}

// 레벨 정의
const LEVELS = ['l1', 'l2', 'l3'];

// 18개 과목 필드 이름을 공통으로 관리 (레벨 접두사 없이)
const SUBJECTS = Array.from({ length: 18 }, (_, idx) => `subject_${idx + 1}`);
// 비고 필드
const NOTE_FIELD = 'note';

// 레벨별 과목 키 생성 (예: L1_subject_1)
function getSubjectKey(level, subjectIndex) {
  return `${level}_subject_${subjectIndex + 1}`;
}

// 레벨별 달성도 키 생성 (예: L1_subject_1_achievement)
function getAchievementKey(level, subjectIndex) {
  return `${level}_subject_${subjectIndex + 1}_achievement`;
}

// 레벨별 모든 과목 키 배열 생성
function getSubjectKeysForLevel(level) {
  return Array.from({ length: 18 }, (_, idx) => getSubjectKey(level, idx));
}

// 레벨별 모든 달성도 키 배열 생성
function getAchievementKeysForLevel(level) {
  return Array.from({ length: 18 }, (_, idx) => getAchievementKey(level, idx));
}

// 과목 이름 매핑 (인덱스는 0부터 시작, 과목 번호는 1부터)
const SUBJECT_NAMES = {
  1: '1_활력징후',
  2: '2_경구투약',
  3: '3_근육주사',
  4: '4_피하주사',
  5: '5_피내주사',
  6: '6_정맥수액주입',
  7: '7_수혈요법',
  8: '8_간헐적 위관영양',
  9: '9_단순도뇨',
  10: '10_유치도뇨',
  11: '11_배출관장',
  12: '12_말초산소포화도 심전도',
  13: '13_비강캐뉼라',
  14: '14_흡인',
  15: '15_기본 심폐소생술, 제세동기 적용',
  16: '16_통증관리',
  17: '17_욕창관리 및 낙상예방간호',
  18: '18_배액관 관리'
};

// 과목 번호(1-18)로 이름 가져오기
function getSubjectName(subjectNumber) {
  return SUBJECT_NAMES[subjectNumber] || `과목 ${subjectNumber}`;
}

// 과목 키(subject_1 등)로 이름 가져오기
function getSubjectNameByKey(subjectKey) {
  const num = parseInt(subjectKey.replace('subject_', ''));
  return getSubjectName(num);
}

// 과목 이름(예: "1_활력징후")으로 과목 번호 찾기
function getSubjectNumberByName(subjectName) {
  if (!subjectName) return null;
  
  // 정확히 일치하는 경우
  for (const [num, name] of Object.entries(SUBJECT_NAMES)) {
    if (name === subjectName) {
      return parseInt(num);
    }
  }
  
  // "1_활력징후" 형식에서 숫자 추출
  const match = subjectName.match(/^(\d+)_/);
  if (match) {
    return parseInt(match[1]);
  }
  
  return null;
}

// 공통 유틸: 폼 데이터를 Firestore 컬럼 구조로 변환 (레벨별)
function buildGradePayload({ studentId, level, subjects, achievements = null, note = null }) {
  const payload = {
    student_id: studentId,
  };

  SUBJECTS.forEach((subjectKey, index) => {
    const levelSubjectKey = getSubjectKey(level, index);
    payload[levelSubjectKey] = subjects[index] ?? null;
    
    // 달성도 추가 (있을 경우)
    if (achievements && achievements[index] !== undefined) {
      const achievementKey = getAchievementKey(level, index);
      payload[achievementKey] = achievements[index] ?? null;
    }
  });
  
  // 비고 추가
  if (note !== undefined) {
    payload[NOTE_FIELD] = note || null;
  }

  return payload;
}

// 공통 유틸: Firestore 문서를 화면용 데이터로 변환 (레벨별)
function normalizeGradeRow(doc, level = 'l1') {
  // doc가 이미 일반 객체인지 확인 (Firestore 문서 객체가 아닌 경우)
  let data, docId;
  if (doc && typeof doc.data === 'function') {
    // Firestore 문서 객체인 경우
    data = doc.data();
    docId = doc.id;
  } else {
    // 이미 일반 객체로 변환된 경우
    data = doc;
    docId = doc.id || doc.student_id;
  }
  
  const subjectKeys = getSubjectKeysForLevel(level);
  
  // updated_at이 Timestamp인 경우 Date로 변환
  let updatedAt = data.updated_at;
  if (updatedAt && typeof updatedAt.toDate === 'function') {
    updatedAt = updatedAt.toDate();
  }
  
  return {
    id: docId,
    student_id: data.student_id,
    subjects: subjectKeys.map((key) => data[key]),
    note: data[NOTE_FIELD] || null,
    updated_at: updatedAt || null,
  };
}

// 모든 레벨의 성적을 포함한 정규화 (학번 검색 시 사용)
function normalizeGradeRowAllLevels(doc) {
  // doc가 이미 일반 객체인지 확인 (Firestore 문서 객체가 아닌 경우)
  let data, docId;
  if (doc && typeof doc.data === 'function') {
    // Firestore 문서 객체인 경우
    data = doc.data();
    docId = doc.id;
  } else {
    // 이미 일반 객체로 변환된 경우
    data = doc;
    docId = doc.id || doc.student_id;
  }
  
  // updated_at이 Timestamp인 경우 Date로 변환
  let updatedAt = data.updated_at;
  if (updatedAt && typeof updatedAt.toDate === 'function') {
    updatedAt = updatedAt.toDate();
  }
  
  return {
    id: docId,
    student_id: data.student_id,
    l1: {
      subjects: getSubjectKeysForLevel('l1').map((key) => data[key]),
      achievements: getAchievementKeysForLevel('l1').map((key) => data[key]),
    },
    l2: {
      subjects: getSubjectKeysForLevel('l2').map((key) => data[key]),
      achievements: getAchievementKeysForLevel('l2').map((key) => data[key]),
    },
    l3: {
      subjects: getSubjectKeysForLevel('l3').map((key) => data[key]),
      achievements: getAchievementKeysForLevel('l3').map((key) => data[key]),
    },
    note: data[NOTE_FIELD] || null,
    updated_at: updatedAt || null,
  };
}

// ========== 공통 유틸리티 함수 (점수 파싱 및 표시) ==========

/**
 * 점수 값에서 숫자만 추출 (예: "85(2024, 기본간호)" -> "85")
 * @param {string|number|null} value - 점수 값
 * @returns {string} 추출된 점수 문자열 또는 '-'
 */
function extractScore(value) {
  if (value === null || value === undefined || value === '') return '-';
  const strValue = String(value);
  const match = strValue.match(/^(\d+(?:\.\d+)?)/);
  return match ? match[1] : '-';
}

/**
 * 화면 표시용 점수 반올림 (최대 소수점 2자리)
 * @param {string|number|null} scoreStr - 점수 문자열
 * @returns {string} 반올림된 점수 문자열
 */
function roundScoreDisplay(scoreStr) {
  if (scoreStr === null || scoreStr === undefined || scoreStr === '' || scoreStr === '-') return scoreStr;
  const n = Number(scoreStr);
  if (!isFinite(n)) return scoreStr;
  return String(Math.round(n * 100) / 100);
}

/**
 * 점수 표시용 (재시험 페이지 등에서 사용)
 * @param {string|number|null} value - 점수 값
 * @returns {string} 표시용 점수 문자열
 */
function getDisplayScore(value) {
  return extractScore(value);
}

/**
 * 점수 셀 표시용 파싱 (일반 "점수(연도,과목)" 및 재시험 "점수(연도,과목,이전)" 모두 처리)
 * @param {string|number|null} value - 점수 값
 * @returns {{score: string, year: string, subjectName: string}} 파싱된 객체
 */
function parseScoreForDisplay(value) {
  const out = { score: '', year: '', subjectName: '' };
  if (value === null || value === undefined || value === '') return out;
  const s = String(value).trim();
  const numMatch = s.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) out.score = numMatch[1];
  const innerMatch = s.match(/^\d+(?:\.\d+)?\((.*)\)$/s);
  if (!innerMatch) return out;
  const parts = innerMatch[1].split(/\s*,\s*/, 3);
  if (parts[0]) out.year = parts[0].trim();
  if (parts[1]) out.subjectName = parts[1].trim();
  return out;
}

/**
 * 재시험 점수 파싱 (모달 pre-fill용)
 * @param {string|number|null} value - 점수 값
 * @returns {{score: string, year: string, subjectName: string}} 파싱된 객체
 */
function parseScoreForRetake(value) {
  const out = { score: '', year: '', subjectName: '' };
  if (value === null || value === undefined || value === '') return out;
  const s = String(value).trim();
  const numMatch = s.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) out.score = numMatch[1];
  const innerMatch = s.match(/^\d+(?:\.\d+)?\((.*)\)$/s);
  if (!innerMatch) return out;
  const parts = innerMatch[1].split(/\s*,\s*/, 3);
  if (parts[0]) out.year = parts[0].trim();
  if (parts[1]) out.subjectName = parts[1].trim();
  return out;
}

/**
 * 재시험 점수 여부 확인 (괄호 안에 쉼표 2개 이상)
 * @param {string|number|null} value - 점수 값
 * @returns {boolean} 재시험 여부
 */
function isRetakeScore(value) {
  if (value === null || value === undefined || value === '') return false;
  const s = String(value).trim();
  if (!s.includes('(') || !s.includes(')')) return false;
  return (s.match(/,/g) || []).length >= 2;
}

/**
 * 재시험 달성도 여부 확인 (괄호 포함, 예: 중(하))
 * @param {string|null} value - 달성도 값
 * @returns {boolean} 재시험 여부
 */
function isRetakeAchievement(value) {
  if (value === null || value === undefined || value === '') return false;
  return String(value).trim().indexOf('(') > 0;
}

/**
 * 달성도 표시용 (괄호 앞까지)
 * @param {string|null} value - 달성도 값
 * @returns {string} 표시용 달성도
 */
function getDisplayAchievement(value) {
  if (value === null || value === undefined || value === '') return '';
  const s = String(value).trim();
  const i = s.indexOf('(');
  return i > 0 ? s.slice(0, i) : s;
}

/**
 * 재시험 점수 괄호 안 내용을 쉼표로 분리 (중첩 괄호 보존)
 * @param {string} inner - 괄호 안 문자열
 * @returns {string[]} 분리된 파트 배열
 */
function splitRetakeInnerParts(inner) {
  const parts = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current) parts.push(current.trim());
  return parts;
}

/**
 * 재시험 형식에서 최초(가장 안쪽) 점수 추출
 * @param {string|number|null} value - 점수 값
 * @returns {string} 최초 점수
 */
function getPreviousScore(value) {
  if (!value) return '';
  const s = String(value).trim();
  if (!isRetakeScore(s)) {
    const score = extractScore(s);
    return score !== '-' ? score : '';
  }
  const innerMatch = s.match(/^\d+(?:\.\d+)?\((.*)\)$/s);
  if (!innerMatch) return '';
  const parts = splitRetakeInnerParts(innerMatch[1]);
  if (parts.length < 3) return '';
  const prevPart = parts[2];
  if (/^\d+(?:\.\d+)?\s*\(/.test(prevPart)) {
    return getPreviousScore(prevPart);
  }
  const score = extractScore(prevPart);
  return score !== '-' ? score : '';
}

/**
 * 재시험 형식에서 최초(가장 안쪽) 달성도 추출
 * @param {string|null} value - 달성도 값
 * @returns {string} 최초 달성도
 */
function getPreviousAchievement(value) {
  if (value === null || value === undefined || value === '') return '';
  const s = String(value).trim();
  if (!isRetakeAchievement(s)) return s;
  let current = s;
  while (current.includes('(')) {
    const i = current.indexOf('(');
    const inner = current.slice(i + 1).replace(/\)+$/, '').trim();
    if (inner.includes('(')) {
      current = inner;
    } else {
      return inner;
    }
  }
  return current;
}

/**
 * 점수와 달성도를 "점수(달성도)" 형식으로 포맷
 * @param {string|number|null} rawScore - 원본 점수 값
 * @param {string|null} rawAchievement - 원본 달성도 값
 * @returns {string} 포맷된 문자열
 */
function formatScoreCell(rawScore, rawAchievement) {
  const currScore = roundScoreDisplay(extractScore(rawScore));
  const currAch = getDisplayAchievement(rawAchievement);
  const hasRetakeScore = isRetakeScore(rawScore);
  const hasRetakeAch = isRetakeAchievement(rawAchievement);
  const isRetake = hasRetakeScore || hasRetakeAch;

  const currStr = currScore !== '-' && currAch ? `${currScore}(${currAch})` : (currScore !== '-' ? currScore : (currAch || '-'));
  if (currStr === '-') return '-';
  if (!isRetake) return currStr;

  const prevScore = roundScoreDisplay(getPreviousScore(rawScore));
  const prevAch = getPreviousAchievement(rawAchievement);
  const prevStr = prevScore && prevAch ? `${prevScore}(${prevAch})` : (prevScore || prevAch || '');
  if (prevStr && currStr) {
    return `${prevStr} → <span class="retake-list-current">${currStr}</span>`;
  }
  return currStr;
}

/**
 * 점수 셀 HTML 생성 (재시험이면 빨간색 클래스 적용)
 * @param {string|number|null} rawValue - 원본 점수 값
 * @param {string} displayValue - 표시할 값
 * @returns {string} HTML 문자열
 */
function scoreCellHtml(rawValue, displayValue) {
  const text = displayValue !== undefined && displayValue !== '' ? displayValue : '-';
  if (isRetakeScore(rawValue)) {
    return `<span class="retake-score">${text}</span>`;
  }
  return text;
}

/**
 * 재시험 저장 시 점수 포맷: 점수(수강 년도, 수강 과목, 이전 점수)
 * @param {string|number} score - 새 점수
 * @param {string} year - 수강 년도
 * @param {string} subjectName - 수강 과목
 * @param {string|number|null} previousValue - 이전 점수 값
 * @returns {string} 포맷된 점수 문자열
 */
function formatRetakeScore(score, year, subjectName, previousValue) {
  const prev = previousValue !== null && previousValue !== undefined && previousValue !== '' ? String(previousValue) : '';
  if (!prev) return `${score}(${year}, ${subjectName})`;
  return `${score}(${year}, ${subjectName}, ${prev})`;
}

/**
 * 재시험 저장 시 달성도 포맷: 새성취도(이전 성취도)
 * @param {string} newAchievement - 새 달성도
 * @param {string|null} previousValue - 이전 달성도 값
 * @returns {string} 포맷된 달성도 문자열
 */
function formatRetakeAchievement(newAchievement, previousValue) {
  const prev = previousValue !== null && previousValue !== undefined && previousValue !== '' ? String(previousValue) : '';
  if (!prev) return newAchievement;
  return `${newAchievement}(${prev})`;
}

/**
 * 해당 레벨·과목이 재시험인지 확인 (점수 또는 달성도가 재시험 형식)
 * @param {object} data - 학생 데이터 객체
 * @param {string} level - 레벨 ('l1', 'l2', 'l3')
 * @param {number} index - 과목 인덱스 (0-17)
 * @returns {boolean} 재시험 여부
 */
function isSubjectRetake(data, level, index) {
  if (!data) return false;
  const sk = getSubjectKey(level, index);
  const ak = getAchievementKey(level, index);
  return isRetakeScore(data[sk]) || isRetakeAchievement(data[ak]);
}

/**
 * 날짜 포맷팅
 * @param {Date|Timestamp|string} dateValue - 날짜 값
 * @param {boolean} includeTime - 시간 포함 여부
 * @returns {string} 포맷된 날짜 문자열
 */
function formatDate(dateValue, includeTime = false) {
  if (!dateValue) return '-';
  let date;
  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (dateValue && typeof dateValue.toDate === 'function') {
    // Firestore Timestamp
    date = dateValue.toDate();
  } else if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else {
    return '-';
  }
  
  if (isNaN(date.getTime())) return '-';
  
  const options = includeTime
    ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: '2-digit', day: '2-digit' };
  return date.toLocaleDateString('ko-KR', options);
}

/**
 * 콘텐츠 포맷팅 (HTML 이스케이프 및 줄바꿈 처리)
 * @param {string} content - 원본 콘텐츠
 * @returns {string} 포맷된 HTML 문자열
 */
function formatContent(content) {
  if (!content) return '';
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/\n/g, '<br />');
}

/**
 * HTML 이스케이프 (XSS 방지)
 * @param {string} str - 이스케이프할 문자열
 * @returns {string} 이스케이프된 문자열
 */
function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * 디바운스 함수 (성능 최적화)
 * @param {Function} func - 실행할 함수
 * @param {number} wait - 대기 시간 (ms)
 * @returns {Function} 디바운스된 함수
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 쓰로틀 함수 (성능 최적화)
 * @param {Function} func - 실행할 함수
 * @param {number} limit - 제한 시간 (ms)
 * @returns {Function} 쓰로틀된 함수
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
