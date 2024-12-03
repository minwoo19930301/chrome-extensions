// popup.js

document.getElementById('save').addEventListener('click', saveCredentials);
document.getElementById('username').addEventListener('keydown', handleEnterKey);
document.getElementById('password').addEventListener('keydown', handleEnterKey);

// 암호화 키 패스프레이즈
const PASSPHRASE = "gmarket";

// 암호화 및 저장 함수
async function saveCredentials() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (username && password) {
        try {
            const key = await getKey(PASSPHRASE);
            const iv = window.crypto.getRandomValues(new Uint8Array(12)); // AES-GCM에 필요한 12바이트 IV 생성

            // 암호화
            const encryptedUsernameBase64 = await encryptData(username, key, iv);
            const encryptedPasswordBase64 = await encryptData(password, key, iv);

            // IV를 Base64로 인코딩하여 저장
            const ivBase64 = arrayBufferToBase64(iv);

            // 저장된 로그인 정보 저장
            chrome.storage.local.set({
                iv: ivBase64,
                encryptedUsername: encryptedUsernameBase64,
                encryptedPassword: encryptedPasswordBase64
            }, () => {
                console.log('로그인 정보가 저장되었습니다.');
            });

            // 메시지를 보내서 background.js에서 크롤링 시작
            chrome.runtime.sendMessage({ action: 'start_crawling' }, (response) => {
                if (response.status === 'success') {
                    console.log('크롤링 시작');
                }
            });

        } catch (error) {
            console.error('암호화 중 오류 발생:', error);
            alert('로그인 정보를 암호화하는 중 오류가 발생했습니다.');
        }
    } else {
        alert('아이디와 비밀번호를 모두 입력해주세요.');
    }
}

// Enter 키 처리 함수
function handleEnterKey(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // 기본 동작 방지
        saveCredentials();
    }
}