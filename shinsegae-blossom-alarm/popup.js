// popup.js

document.getElementById('save').addEventListener('click', saveCredentials);
document.getElementById('username').addEventListener('keydown', handleEnterKey);
document.getElementById('password').addEventListener('keydown', handleEnterKey);

// 암호화 키 패스프레이즈
const PASSPHRASE = "gmarket";

// 암호화 및 URL 전달 함수
async function saveCredentials() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (username && password) {
        try {
            const key = await getKey(PASSPHRASE);
            const encoder = new TextEncoder();
            const iv = window.crypto.getRandomValues(new Uint8Array(12)); // AES-GCM에 필요한 12바이트 IV 생성

            // 사용자 이름 암호화
            const encryptedUsername = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                key,
                encoder.encode(username)
            );

            // 비밀번호 암호화
            const encryptedPassword = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                key,
                encoder.encode(password)
            );

            // IV를 Base64로 인코딩하여 URL에 포함
            const ivBase64 = arrayBufferToBase64(iv);

            // 암호화된 데이터를 Base64로 인코딩
            const encryptedUsernameBase64 = arrayBufferToBase64(encryptedUsername);
            const encryptedPasswordBase64 = arrayBufferToBase64(encryptedPassword);

            // URL에 암호화된 데이터와 IV를 쿼리 파라미터로 추가
            const LOGIN_URL = `https://blossom.shinsegae.com/WebSite/Basic/Board/BoardList.aspx?system=Board&fdid=45044&iv=${encodeURIComponent(ivBase64)}&blossom_username=${encodeURIComponent(encryptedUsernameBase64)}&blossom_password=${encodeURIComponent(encryptedPasswordBase64)}`;

            // 로그인 페이지 열기
            chrome.tabs.create({ url: LOGIN_URL, active: true }, (tab) => {
                console.log(`로그인 페이지를 열기 위해 새로운 탭을 열었습니다. 탭 ID: ${tab.id}`);
            });

            // 팝업 탭 닫기 (옵션)
            window.close();
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

// ArrayBuffer를 Base64로 변환하는 함수
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => binary += String.fromCharCode(b));
    return window.btoa(binary);
}