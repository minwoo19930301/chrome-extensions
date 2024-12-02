// popup.js

document.getElementById('save').addEventListener('click', () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username && password) {
        chrome.storage.sync.set({ blossom_username: username, blossom_password: password }, () => {
            alert('로그인 정보가 저장되었습니다.');
        });
    } else {
        alert('아이디와 비밀번호를 모두 입력해주세요.');
    }
});