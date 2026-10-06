/**
 * 가입 요청 / 비밀번호 초기화 요청 / 비밀번호 재설정 시 EmailJS를 통해 관리자에게 이메일 알림 발송.
 * EmailJS 설정이 필요합니다:
 * 1. https://www.emailjs.com 에서 계정 생성
 * 2. Email Service 생성 (Gmail, Outlook 등)
 * 3. Email Template 생성
 * 4. 아래 ADMIN_EMAIL과 EmailJS 설정값을 입력하세요.
 * 실패해도 사용자 화면에는 영향 없음 (조용히 무시).
 */

// 관리자 이메일 주소 (여기에 본인의 이메일 주소를 입력하세요)
const ADMIN_EMAIL = 'codesensory@gmail.com';

// EmailJS 설정 (EmailJS 대시보드에서 확인 가능)
const EMAILJS_SERVICE_ID = 'service_idm2m5a'; // EmailJS Service ID
const EMAILJS_TEMPLATE_ID = 'template_6aq3mmu'; // EmailJS Template ID (관리자 알림용)
const EMAILJS_PUBLIC_KEY = '9Vyz_8-WAwyK1A-2_'; // EmailJS Public Key

// 사용자에게 보내는 이메일용 템플릿 ID (승인 알림용)
const EMAILJS_USER_TEMPLATE_ID = 'template_ehhbapb'; // 사용자 알림용 Template ID (여기에 사용자 알림용 템플릿 ID 입력)

(function () {
  // EmailJS SDK가 로드되었는지 확인
  function isEmailJSLoaded() {
    return typeof emailjs !== 'undefined';
  }

  function notifyRequestEmail(payload) {
    // EmailJS가 로드되지 않았거나 설정이 안 되어 있으면 조용히 무시
    if (!isEmailJSLoaded()) {
      return;
    }

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || 
        EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' || 
        EMAILJS_TEMPLATE_ID === 'YOUR_TEMPLATE_ID' || 
        EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
      return;
    }

    // EmailJS 초기화
    emailjs.init(EMAILJS_PUBLIC_KEY);

    // 이메일 제목 및 내용 생성
    var emailSubject = '';
    var emailBody = '';

    if (payload.type === 'signup_request') {
      emailSubject = '[간호학과 성적 관리] 회원가입 요청';
      emailBody = '새로운 회원가입 요청이 접수되었습니다.\n\n' +
        '아이디: ' + (payload.username || '') + '\n' +
        '이름: ' + (payload.name || '') + '\n' +
        '직함: ' + (payload.title || '없음') + '\n\n' +
        '관리자 페이지에서 승인해주세요.';
    } else if (payload.type === 'password_reset_request') {
      emailSubject = '[간호학과 성적 관리] 비밀번호 초기화 요청';
      emailBody = '비밀번호 초기화 요청이 접수되었습니다.\n\n' +
        '아이디: ' + (payload.username || '') + '\n' +
        '이메일: ' + (payload.email || '') + '\n\n' +
        '관리자 페이지에서 승인해주세요.';
    } else if (payload.type === 'password_reset_completed') {
      emailSubject = '[간호학과 성적 관리] 비밀번호 재설정 완료';
      emailBody = '비밀번호가 재설정되었습니다.\n\n' +
        '아이디: ' + (payload.username || '') + '\n' +
        '재설정 시간: ' + (payload.resetTime || new Date().toLocaleString('ko-KR')) + '\n\n' +
        '확인해주세요.';
    } else {
      emailSubject = '[간호학과 성적 관리] 알림';
      emailBody = JSON.stringify(payload, null, 2);
    }

    // EmailJS로 이메일 전송
    var templateParams = {
      to_email: ADMIN_EMAIL,
      subject: emailSubject,
      message: emailBody,
      type: payload.type || 'unknown',
      username: payload.username || '',
      name: payload.name || '',
      email: payload.email || ''
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
      .then(function(response) {
        // 성공 시 조용히 처리 (콘솔 로그 없음)
      })
      .catch(function(error) {
        // 실패 시 조용히 무시 (콘솔 로그 없음)
      });
  }

  /**
   * 사용자에게 이메일 발송 (가입 승인, 비밀번호 초기화 승인 등)
   * @param {object} payload - 이메일 발송 정보
   * @param {string} payload.type - 이메일 유형 ('signup_approved', 'password_reset_approved')
   * @param {string} payload.to_email - 수신자 이메일 주소
   * @param {string} payload.username - 사용자 아이디/이메일
   * @param {string} payload.name - 사용자 이름 (선택)
   */
  function sendUserEmail(payload) {
    // EmailJS가 로드되지 않았거나 설정이 안 되어 있으면 조용히 무시
    if (!isEmailJSLoaded()) {
      return;
    }

    if (!EMAILJS_SERVICE_ID || !EMAILJS_USER_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || 
        EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' || 
        EMAILJS_USER_TEMPLATE_ID === 'YOUR_USER_TEMPLATE_ID' || 
        EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
      return;
    }

    if (!payload.to_email) {
      return;
    }

    // EmailJS 초기화
    emailjs.init(EMAILJS_PUBLIC_KEY);

    // 이메일 제목 및 내용 생성
    var emailSubject = '';
    var emailBody = '';

    if (payload.type === 'signup_approved') {
      emailSubject = '[간호학과 성적 관리] 회원가입 승인 완료';
      emailBody = '회원가입 요청이 승인되었습니다.\n\n' +
        '이제 로그인하여 서비스를 이용하실 수 있습니다.\n\n' +
        '아이디(이메일): ' + (payload.username || payload.to_email) + '\n\n' +
        '감사합니다.';
    } else if (payload.type === 'password_reset_approved') {
      emailSubject = '[간호학과 성적 관리] 비밀번호 초기화 승인 완료';
      emailBody = '비밀번호 초기화 요청이 승인되었습니다.\n\n' +
        '아래 링크에서 새 비밀번호를 설정하실 수 있습니다:\n' +
        '(비밀번호 재설정 페이지로 이동하여 이메일을 입력하세요)\n\n' +
        '이메일: ' + (payload.to_email || '') + '\n\n' +
        '비밀번호 재설정 페이지: ' + (window.location.origin || '') + '/reset-password.html\n\n' +
        '감사합니다.';
    } else {
      emailSubject = '[간호학과 성적 관리] 알림';
      emailBody = JSON.stringify(payload, null, 2);
    }

    // EmailJS로 이메일 전송
    // EmailJS 템플릿에서 사용할 수 있는 변수들:
    // - to_email: 수신자 이메일 주소
    // - from_name: 발신자 이름
    // - from_email: 발신자 이메일 (또는 Reply-To)
    // - reply_to: 답장 받을 이메일 주소
    // - subject: 이메일 제목
    // - message: 이메일 내용
    var templateParams = {
      to_email: payload.to_email, // 수신자 이메일 (템플릿의 "To Email" 필드에 사용)
      from_name: '간호학과 성적 관리', // 발신자 이름 (템플릿의 "From Name" 필드에 사용)
      from_email: ADMIN_EMAIL, // 발신자 이메일 (템플릿의 "From Email" 필드에 사용)
      reply_to: ADMIN_EMAIL, // 답장 받을 이메일 주소
      subject: emailSubject, // 이메일 제목
      message: emailBody, // 이메일 내용
      type: payload.type || 'unknown',
      username: payload.username || payload.to_email,
      name: payload.name || ''
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_USER_TEMPLATE_ID, templateParams)
      .then(function(response) {
        // 성공 시 조용히 처리 (콘솔 로그 없음)
      })
      .catch(function(error) {
        // 실패 시 조용히 무시 (콘솔 로그 없음)
      });
  }

  window.notifyRequestEmail = notifyRequestEmail;
  window.sendUserEmail = sendUserEmail;
})();
