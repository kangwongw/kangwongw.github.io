/**
 * 로그인/세션 및 비밀번호 해시 (PBKDF2-SHA256)
 */
(function () {
  var PBKDF2_ITERATIONS = 100000;
  var SALT_LENGTH = 16;
  var HASH_LENGTH = 32;

  function isPublicPage() {
    var name = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname.split('/').pop() : '';
    return name === 'login.html' || name === 'signup.html' || name === 'reset-request.html' || name === 'reset-password.html' || name === '' || name === 'index.html';
  }

  function getSession() {
    try {
      var raw = sessionStorage.getItem('auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(user) {
    try {
      sessionStorage.setItem('auth_user', JSON.stringify({
        username: user.username,
        name: user.name,
        title: user.title,
        is_admin: user.is_admin === true
      }));
    } catch (e) {}
  }

  function clearSession() {
    try {
      sessionStorage.removeItem('auth_user');
    } catch (e) {}
  }

  function requireAuth() {
    if (isPublicPage()) return;
    if (!getSession()) {
      window.location.href = 'login.html';
    }
  }

  function b64ToBuf(b64) {
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr.buffer;
  }

  function bufToB64(buf) {
    var arr = new Uint8Array(buf);
    var bin = '';
    for (var i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
    return btoa(bin);
  }

  function generateSalt() {
    var arr = new Uint8Array(SALT_LENGTH);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(arr);
    }
    return bufToB64(arr);
  }

  function hashPassword(password, saltB64) {
    var enc = new TextEncoder();
    var salt = b64ToBuf(saltB64);
    return crypto.subtle
      .importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
      .then(function (keyMaterial) {
        return crypto.subtle.deriveBits(
          {
            name: 'PBKDF2',
            salt: salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
          },
          keyMaterial,
          HASH_LENGTH * 8
        );
      })
      .then(function (bits) {
        return bufToB64(bits);
      });
  }

  function verifyPassword(password, saltB64, storedHashB64) {
    return hashPassword(password, saltB64).then(function (computedHash) {
      return computedHash === storedHashB64;
    });
  }

  window.Auth = {
    getSession: getSession,
    setSession: setSession,
    clearSession: clearSession,
    requireAuth: requireAuth,
    isPublicPage: isPublicPage,
    generateSalt: generateSalt,
    hashPassword: hashPassword,
    verifyPassword: verifyPassword
  };

  document.addEventListener('DOMContentLoaded', function () {
    // public 페이지에서는 requireAuth를 실행하지 않음
    if (!isPublicPage()) {
      requireAuth();
    }
    var logoLink = document.getElementById('logo-link');
    if (logoLink) {
      logoLink.href = getSession() ? 'view.html' : 'index.html';
    }
  });
})();
