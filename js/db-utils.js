/**
 * Firestore 데이터베이스 쿼리 유틸리티 함수
 * Firestore 쿼리를 통합하여 재사용성과 유지보수성 향상
 */

const DB_UTILS = {
  /**
   * 학생 성적 전체 조회
   * @param {object} options - 옵션 객체
   * @param {string} options.orderBy - 정렬 필드 (기본: 'student_id')
   * @param {boolean} options.ascending - 오름차순 여부 (기본: true)
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  async fetchAllGrades({ orderBy = 'student_id', ascending = true } = {}) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      const query = window.db.collection('student_grades')
        .orderBy(orderBy, ascending ? 'asc' : 'desc');
      
      const snapshot = await query.get();
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        // Timestamp를 Date로 변환 (필요시)
        if (docData.updated_at && docData.updated_at.toDate) {
          docData.updated_at = docData.updated_at.toDate();
        }
        if (docData.created_at && docData.created_at.toDate) {
          docData.created_at = docData.created_at.toDate();
        }
        return {
          id: doc.id,
          ...docData
        };
      });
      
      return { data, error: null };
    } catch (err) {
      console.error('fetchAllGrades 오류:', err);
      return { data: [], error: err };
    }
  },

  /**
   * 학번으로 학생 성적 조회
   * @param {string} studentId - 학번
   * @returns {Promise<{data: object|null, error: Error|null}>}
   */
  async fetchGradeByStudentId(studentId) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      const docRef = window.db.collection('student_grades').doc(studentId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return { data: null, error: null };
      }
      
      const docData = doc.data();
      // Timestamp를 Date로 변환 (필요시)
      if (docData.updated_at && docData.updated_at.toDate) {
        docData.updated_at = docData.updated_at.toDate();
      }
      if (docData.created_at && docData.created_at.toDate) {
        docData.created_at = docData.created_at.toDate();
      }
      
      return { data: { id: doc.id, ...docData }, error: null };
    } catch (err) {
      console.error('fetchGradeByStudentId 오류:', err);
      return { data: null, error: err };
    }
  },

  /**
   * 이름으로 학생 검색 (부분 일치)
   * @param {string} name - 이름 (부분 일치)
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  async searchGradesByName(name) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      // Firestore는 부분 일치 검색이 제한적이므로 클라이언트 측 필터링 사용
      const snapshot = await window.db.collection('student_grades')
        .orderBy('student_id', 'asc')
        .get();
      
      const nameLower = name.toLowerCase();
      const data = snapshot.docs
        .map(doc => {
          const docData = doc.data();
          // Timestamp를 Date로 변환 (필요시)
          if (docData.updated_at && docData.updated_at.toDate) {
            docData.updated_at = docData.updated_at.toDate();
          }
          if (docData.created_at && docData.created_at.toDate) {
            docData.created_at = docData.created_at.toDate();
          }
          return { id: doc.id, ...docData };
        })
        .filter(doc => {
          const studentName = (doc.student_name || '').toLowerCase();
          return studentName.includes(nameLower);
        });
      
      return { data, error: null };
    } catch (err) {
      console.error('searchGradesByName 오류:', err);
      return { data: [], error: err };
    }
  },

  /**
   * 학생 성적 삽입
   * @param {object|Array} payload - 삽입할 데이터 (단일 객체 또는 배열)
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async insertGrade(payload) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      const isArray = Array.isArray(payload);
      const payloads = isArray ? payload : [payload];
      const results = [];
      
      for (const data of payloads) {
        const studentId = data.student_id;
        if (!studentId) {
          throw new Error('student_id가 필요합니다.');
        }
        
        // 타임스탬프 추가
        const docData = {
          ...data,
          created_at: firebase.firestore.FieldValue.serverTimestamp(),
          updated_at: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await window.db.collection('student_grades').doc(studentId).set(docData);
        const doc = await window.db.collection('student_grades').doc(studentId).get();
        const docDataResult = doc.data();
        // Timestamp를 Date로 변환 (필요시)
        if (docDataResult.updated_at && docDataResult.updated_at.toDate) {
          docDataResult.updated_at = docDataResult.updated_at.toDate();
        }
        if (docDataResult.created_at && docDataResult.created_at.toDate) {
          docDataResult.created_at = docDataResult.created_at.toDate();
        }
        results.push({ id: doc.id, ...docDataResult });
      }
      
      return { data: isArray ? results : results[0], error: null };
    } catch (err) {
      console.error('insertGrade 오류:', err);
      return { data: null, error: err };
    }
  },

  /**
   * 학생 성적 업데이트
   * @param {string} studentId - 학번
   * @param {object} updateData - 업데이트할 데이터
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async updateGrade(studentId, updateData) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      const docRef = window.db.collection('student_grades').doc(studentId);
      
      // updated_at 자동 업데이트
      const updatePayload = {
        ...updateData,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await docRef.update(updatePayload);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return { data: null, error: new Error('문서를 찾을 수 없습니다.') };
      }
      
      const docData = doc.data();
      // Timestamp를 Date로 변환 (필요시)
      if (docData.updated_at && docData.updated_at.toDate) {
        docData.updated_at = docData.updated_at.toDate();
      }
      if (docData.created_at && docData.created_at.toDate) {
        docData.created_at = docData.created_at.toDate();
      }
      
      return { data: [{ id: doc.id, ...docData }], error: null };
    } catch (err) {
      console.error('updateGrade 오류:', err);
      return { data: null, error: err };
    }
  },

  /**
   * 학생 성적 삭제
   * @param {string} studentId - 학번
   * @returns {Promise<{error: Error|null}>}
   */
  async deleteGrade(studentId) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      await window.db.collection('student_grades').doc(studentId).delete();
      return { error: null };
    } catch (err) {
      console.error('deleteGrade 오류:', err);
      return { error: err };
    }
  },

  /**
   * 기존 학번 목록 조회 (중복 체크용)
   * @returns {Promise<{data: Set<string>, error: Error|null}>}
   */
  async fetchExistingStudentIds() {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      const snapshot = await window.db.collection('student_grades').get();
      const idSet = new Set();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const studentId = String(data.student_id || '').trim();
        if (studentId) {
          idSet.add(studentId);
        }
      });
      
      return { data: idSet, error: null };
    } catch (err) {
      console.error('fetchExistingStudentIds 오류:', err);
      return { data: new Set(), error: err };
    }
  },

  /**
   * 게시판 게시글 전체 조회
   * @param {object} options - 옵션 객체
   * @param {string} options.orderBy - 정렬 필드 (기본: 'created_at')
   * @param {boolean} options.ascending - 오름차순 여부 (기본: false)
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  async fetchAllAnnouncements({ orderBy = 'created_at', ascending = false } = {}) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      const snapshot = await window.db.collection('announcements')
        .orderBy(orderBy, ascending ? 'asc' : 'desc')
        .get();
      
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        // Timestamp를 Date로 변환 (필요시)
        if (docData.updated_at && docData.updated_at.toDate) {
          docData.updated_at = docData.updated_at.toDate();
        }
        if (docData.created_at && docData.created_at.toDate) {
          docData.created_at = docData.created_at.toDate();
        }
        return {
          id: doc.id,
          ...docData
        };
      });
      
      return { data, error: null };
    } catch (err) {
      console.error('fetchAllAnnouncements 오류:', err);
      return { data: [], error: err };
    }
  },

  /**
   * 게시판 게시글 삽입
   * @param {object} payload - 삽입할 데이터
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async insertAnnouncement(payload) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      const docData = {
        ...payload,
        views: payload.views || 0,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await window.db.collection('announcements').add(docData);
      const doc = await docRef.get();
      
      const docDataResult = doc.data();
      // Timestamp를 Date로 변환 (필요시)
      if (docDataResult.updated_at && docDataResult.updated_at.toDate) {
        docDataResult.updated_at = docDataResult.updated_at.toDate();
      }
      if (docDataResult.created_at && docDataResult.created_at.toDate) {
        docDataResult.created_at = docDataResult.created_at.toDate();
      }
      
      return { data: [{ id: doc.id, ...docDataResult }], error: null };
    } catch (err) {
      console.error('insertAnnouncement 오류:', err);
      return { data: null, error: err };
    }
  },

  /**
   * 게시판 게시글 업데이트
   * @param {string} id - 게시글 ID
   * @param {object} updateData - 업데이트할 데이터
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async updateAnnouncement(id, updateData) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      const docRef = window.db.collection('announcements').doc(id);
      
      const updatePayload = {
        ...updateData,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await docRef.update(updatePayload);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return { data: null, error: new Error('문서를 찾을 수 없습니다.') };
      }
      
      const docData = doc.data();
      // Timestamp를 Date로 변환 (필요시)
      if (docData.updated_at && docData.updated_at.toDate) {
        docData.updated_at = docData.updated_at.toDate();
      }
      if (docData.created_at && docData.created_at.toDate) {
        docData.created_at = docData.created_at.toDate();
      }
      
      return { data: [{ id: doc.id, ...docData }], error: null };
    } catch (err) {
      console.error('updateAnnouncement 오류:', err);
      return { data: null, error: err };
    }
  },

  /**
   * 게시판 게시글 삭제
   * @param {string} id - 게시글 ID
   * @returns {Promise<{error: Error|null}>}
   */
  async deleteAnnouncement(id) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      await window.db.collection('announcements').doc(id).delete();
      return { error: null };
    } catch (err) {
      console.error('deleteAnnouncement 오류:', err);
      return { error: err };
    }
  },

  /**
   * 게시판 게시글 ID로 조회
   * @param {string} id - 게시글 ID
   * @returns {Promise<{data: object|null, error: Error|null}>}
   */
  async fetchAnnouncementById(id) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      const doc = await window.db.collection('announcements').doc(id).get();
      
      if (!doc.exists) {
        return { data: null, error: null };
      }
      
      const docData = doc.data();
      // Timestamp를 Date로 변환 (필요시)
      if (docData.updated_at && docData.updated_at.toDate) {
        docData.updated_at = docData.updated_at.toDate();
      }
      if (docData.created_at && docData.created_at.toDate) {
        docData.created_at = docData.created_at.toDate();
      }
      
      return { data: { id: doc.id, ...docData }, error: null };
    } catch (err) {
      console.error('fetchAnnouncementById 오류:', err);
      return { data: null, error: err };
    }
  },

  /**
   * 비밀번호 재설정 요청 삽입
   * @param {object} payload - 삽입할 데이터
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async insertPasswordResetRequest(payload) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      const docData = {
        ...payload,
        created_at: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await window.db.collection('password_reset_requests').add(docData);
      const doc = await docRef.get();
      
      const docDataResult = doc.data();
      // Timestamp를 Date로 변환 (필요시)
      if (docDataResult.created_at && docDataResult.created_at.toDate) {
        docDataResult.created_at = docDataResult.created_at.toDate();
      }
      
      return { data: [{ id: doc.id, ...docDataResult }], error: null };
    } catch (err) {
      console.error('insertPasswordResetRequest 오류:', err);
      return { data: null, error: err };
    }
  },

  /**
   * 비밀번호 재설정 요청 업데이트
   * @param {string} id - 요청 ID
   * @param {object} updateData - 업데이트할 데이터
   * @returns {Promise<{error: Error|null}>}
   */
  async updatePasswordResetRequest(id, updateData) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      await window.db.collection('password_reset_requests').doc(id).update(updateData);
      return { error: null };
    } catch (err) {
      console.error('updatePasswordResetRequest 오류:', err);
      return { error: err };
    }
  },

  /**
   * 비밀번호 재설정 요청 조회 (승인됨, 미사용, 최신순)
   * @param {string} email - 이메일 주소
   * @returns {Promise<{data: object|null, error: Error|null}>}
   */
  async fetchLatestApprovedResetRequest(email) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      const snapshot = await window.db.collection('password_reset_requests')
        .where('email', '==', email)
        .where('approved', '==', true)
        .where('used', '==', false)
        .orderBy('created_at', 'desc')
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return { data: null, error: null };
      }
      
      const doc = snapshot.docs[0];
      const docData = doc.data();
      // Timestamp를 Date로 변환 (필요시)
      if (docData.created_at && docData.created_at.toDate) {
        docData.created_at = docData.created_at.toDate();
      }
      return { data: { id: doc.id, ...docData }, error: null };
    } catch (err) {
      console.error('fetchLatestApprovedResetRequest 오류:', err);
      return { data: null, error: err };
    }
  },

  /**
   * 비밀번호 재설정 요청 조회 (ID로)
   * @param {string} id - 요청 ID
   * @returns {Promise<{data: object|null, error: Error|null}>}
   */
  async fetchPasswordResetRequestById(id) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      const doc = await window.db.collection('password_reset_requests').doc(id).get();
      
      if (!doc.exists) {
        return { data: null, error: null };
      }
      
      const docData = doc.data();
      // Timestamp를 Date로 변환 (필요시)
      if (docData.created_at && docData.created_at.toDate) {
        docData.created_at = docData.created_at.toDate();
      }
      return { data: { id: doc.id, ...docData }, error: null };
    } catch (err) {
      console.error('fetchPasswordResetRequestById 오류:', err);
      return { data: null, error: err };
    }
  },

  /**
   * 비밀번호 재설정 요청 전체 조회
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  async fetchAllResetRequests() {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      const snapshot = await window.db.collection('password_reset_requests')
        .orderBy('created_at', 'desc')
        .get();
      
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        // Timestamp를 Date로 변환 (필요시)
        if (docData.created_at && docData.created_at.toDate) {
          docData.created_at = docData.created_at.toDate();
        }
        return {
          id: doc.id,
          ...docData
        };
      });
      
      return { data, error: null };
    } catch (err) {
      console.error('fetchAllResetRequests 오류:', err);
      return { data: [], error: err };
    }
  },

  /**
   * 비밀번호 재설정 요청 삭제
   * @param {string} id - 요청 ID
   * @returns {Promise<{error: Error|null}>}
   */
  async deletePasswordResetRequest(id) {
    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      await window.db.collection('password_reset_requests').doc(id).delete();
      return { error: null };
    } catch (err) {
      console.error('deletePasswordResetRequest 오류:', err);
      return { error: err };
    }
  },

  /**
   * 사용자 관련 쿼리 (users 컬렉션)
   */
  users: {
    /**
     * 사용자 조회 (로그인용)
     * @param {string} username - 사용자명
     * @returns {Promise<{data: object|null, error: Error|null}>}
     */
    async fetchByUsername(username) {
      try {
        if (!window.db) {
          throw new Error('Firestore가 초기화되지 않았습니다.');
        }
        
        const snapshot = await window.db.collection('users')
          .where('username', '==', username)
          .limit(1)
          .get();
        
        if (snapshot.empty) {
          return { data: null, error: null };
        }
        
        const doc = snapshot.docs[0];
        const docData = doc.data();
        // Timestamp를 Date로 변환 (필요시)
        if (docData.updated_at && docData.updated_at.toDate) {
          docData.updated_at = docData.updated_at.toDate();
        }
        if (docData.created_at && docData.created_at.toDate) {
          docData.created_at = docData.created_at.toDate();
        }
        return { data: { id: doc.id, ...docData }, error: null };
      } catch (err) {
        console.error('fetchByUsername 오류:', err);
        return { data: null, error: err };
      }
    },

    /**
     * 사용자 조회 (이메일로)
     * @param {string} email - 이메일 주소
     * @returns {Promise<{data: object|null, error: Error|null}>}
     */
    async fetchByEmail(email) {
      try {
        if (!window.db) {
          throw new Error('Firestore가 초기화되지 않았습니다.');
        }
        
        const snapshot = await window.db.collection('users')
          .where('email', '==', email)
          .limit(1)
          .get();
        
        if (snapshot.empty) {
          return { data: null, error: null };
        }
        
        const doc = snapshot.docs[0];
        const docData = doc.data();
        // Timestamp를 Date로 변환 (필요시)
        if (docData.updated_at && docData.updated_at.toDate) {
          docData.updated_at = docData.updated_at.toDate();
        }
        if (docData.created_at && docData.created_at.toDate) {
          docData.created_at = docData.created_at.toDate();
        }
        return { data: { id: doc.id, ...docData }, error: null };
      } catch (err) {
        console.error('fetchByEmail 오류:', err);
        return { data: null, error: err };
      }
    },

    /**
     * 사용자 삽입
     * @param {object} payload - 삽입할 데이터
     * @returns {Promise<{data: Array|null, error: Error|null}>}
     */
    async insert(payload) {
      try {
        if (!window.db) {
          throw new Error('Firestore가 초기화되지 않았습니다.');
        }
        
        const docData = {
          ...payload,
          created_at: firebase.firestore.FieldValue.serverTimestamp(),
          updated_at: firebase.firestore.FieldValue.serverTimestamp()
        };
        
      const docRef = await window.db.collection('users').add(docData);
      const doc = await docRef.get();
      
      const docDataResult = doc.data();
      // Timestamp를 Date로 변환 (필요시)
      if (docDataResult.updated_at && docDataResult.updated_at.toDate) {
        docDataResult.updated_at = docDataResult.updated_at.toDate();
      }
      if (docDataResult.created_at && docDataResult.created_at.toDate) {
        docDataResult.created_at = docDataResult.created_at.toDate();
      }
      
      return { data: [{ id: doc.id, ...docDataResult }], error: null };
      } catch (err) {
        console.error('users.insert 오류:', err);
        return { data: null, error: err };
      }
    },

    /**
     * 사용자 업데이트
     * @param {string} id - 사용자 ID
     * @param {object} updateData - 업데이트할 데이터
     * @returns {Promise<{data: Array|null, error: Error|null}>}
     */
    async update(id, updateData) {
      try {
        if (!window.db) {
          throw new Error('Firestore가 초기화되지 않았습니다.');
        }
        
        const docRef = window.db.collection('users').doc(id);
        
        const updatePayload = {
          ...updateData,
          updated_at: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await docRef.update(updatePayload);
        const doc = await docRef.get();
        
        if (!doc.exists) {
          return { data: null, error: new Error('문서를 찾을 수 없습니다.') };
        }
        
        const docData = doc.data();
        // Timestamp를 Date로 변환 (필요시)
        if (docData.updated_at && docData.updated_at.toDate) {
          docData.updated_at = docData.updated_at.toDate();
        }
        if (docData.created_at && docData.created_at.toDate) {
          docData.created_at = docData.created_at.toDate();
        }
        
        return { data: [{ id: doc.id, ...docData }], error: null };
      } catch (err) {
        console.error('users.update 오류:', err);
        return { data: null, error: err };
      }
    },

    /**
     * 사용자 조회 (ID로)
     * @param {string} id - 사용자 ID
     * @returns {Promise<{data: object|null, error: Error|null}>}
     */
    async fetchById(id) {
      try {
        if (!window.db) {
          throw new Error('Firestore가 초기화되지 않았습니다.');
        }
        
        const doc = await window.db.collection('users').doc(id).get();
        
        if (!doc.exists) {
          return { data: null, error: null };
        }
        
        const docData = doc.data();
        // Timestamp를 Date로 변환 (필요시)
        if (docData.updated_at && docData.updated_at.toDate) {
          docData.updated_at = docData.updated_at.toDate();
        }
        if (docData.created_at && docData.created_at.toDate) {
          docData.created_at = docData.created_at.toDate();
        }
        return { data: { id: doc.id, ...docData }, error: null };
      } catch (err) {
        console.error('fetchById 오류:', err);
        return { data: null, error: err };
      }
    },

    /**
     * 사용자 삭제
     * @param {string} id - 사용자 ID
     * @returns {Promise<{error: Error|null}>}
     */
    async delete(id) {
      try {
        if (!window.db) {
          throw new Error('Firestore가 초기화되지 않았습니다.');
        }
        
        await window.db.collection('users').doc(id).delete();
        return { error: null };
      } catch (err) {
        console.error('users.delete 오류:', err);
        return { error: err };
      }
    },

    /**
     * 승인 대기 중인 사용자 목록 조회
     * @returns {Promise<{data: Array, error: Error|null}>}
     */
    async fetchPendingApprovals() {
      try {
        if (!window.db) {
          throw new Error('Firestore가 초기화되지 않았습니다.');
        }
        
        const snapshot = await window.db.collection('users')
          .where('approved', '==', false)
          .orderBy('created_at', 'desc')
          .get();
        
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          let createdAt = docData.created_at;
          // Timestamp를 Date로 변환 (필요시)
          if (createdAt && createdAt.toDate) {
            createdAt = createdAt.toDate();
          }
          return {
            id: doc.id,
            username: docData.username,
            name: docData.name,
            title: docData.title,
            created_at: createdAt
          };
        });
        
        return { data, error: null };
      } catch (err) {
        console.error('fetchPendingApprovals 오류:', err);
        return { data: [], error: err };
      }
    }
  }
};

// 전역으로 노출
if (typeof window !== 'undefined') {
  window.DB_UTILS = DB_UTILS;
}
