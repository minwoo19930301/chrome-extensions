document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const status = document.getElementById('status');

    // 저장된 로그인 정보를 폼에 채워넣기
    chrome.storage.local.get(['userId', 'password'], (data) => {
        if (data.userId) document.getElementById('userId').value = data.userId;
        if (data.password) document.getElementById('password').value = data.password;
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userId = document.getElementById('userId').value;
        const password = document.getElementById('password').value;

        chrome.storage.local.set({ userId, password }, () => {
            if (chrome.runtime.lastError) {
                status.textContent = '로그인 정보 저장 실패!';
            } else {
                status.textContent = '로그인 정보가 저장되었습니다.';
                // 백그라운드 스크립트에 로그인 시작 요청
                chrome.runtime.sendMessage({ action: 'start' });
            }
        });
    });
});