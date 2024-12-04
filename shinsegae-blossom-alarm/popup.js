// popup.js

document.getElementById('save').addEventListener('click', saveCredentials);
document.getElementById('username').addEventListener('keydown', handleEnterKey);
document.getElementById('password').addEventListener('keydown', handleEnterKey);
document.getElementById('interval').addEventListener('keydown', handleEnterKey);

// 암호화 키 패스프레이즈
const PASSPHRASE = "gmarket";

// 팝업 로드 시 알람 간격과 제외 분류 불러오기
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['alarmInterval', 'excludedCategories', 'iv', 'encryptedUsername', 'encryptedPassword'], (result) => {
        const interval = result.alarmInterval || 1;
        document.getElementById('interval').value = interval;

        // 제외 분류 체크박스 상태 복원
        const excludedCategories = result.excludedCategories || [];
        const checkboxes = document.querySelectorAll('#excludedCategoriesContainer input[type="checkbox"]');
        checkboxes.forEach((checkbox) => {
            if (excludedCategories.includes(checkbox.value)) {
                checkbox.checked = true;
            }
        });

        // 저장된 로그인 정보 복원 (선택 사항)
        // 암호화된 로그인 정보를 복호화하여 복원하려면 추가 작업 필요
    });
});

// 암호화 및 저장 함수
async function saveCredentials() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const intervalInput = document.getElementById('interval').value.trim();

    let interval = parseInt(intervalInput, 10);
    if (isNaN(interval) || interval < 1) {
        interval = 1; // 유효하지 않은 값이면 기본값 1분으로 설정
    }

    // 제외할 분류 목록 가져오기
    const checkboxes = document.querySelectorAll('#excludedCategoriesContainer input[type="checkbox"]');
    const excludedCategories = Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

    // 알람 간격과 제외 분류 저장
    chrome.storage.local.set({ alarmInterval: interval, excludedCategories: excludedCategories }, () => {
        console.log('알람 간격과 제외 분류가 저장되었습니다.');

        // 알람 재설정
        chrome.runtime.sendMessage({ action: 'reset_alarm' }, (response) => {
            if (response.status === 'success') {
                console.log('알람이 재설정되었습니다.');
            }
        });
    });

    if (username && password) {
        try {
            const key = await getKey(PASSPHRASE);
            const iv = window.crypto.getRandomValues(new Uint8Array(12)); // AES-GCM에 필요한 12바이트 IV 생성

            // 암호화
            const encryptedUsernameBase64 = await encryptData(username, key, iv);
            const encryptedPasswordBase64 = await encryptData(password, key, iv);

            // IV를 Base64로 인코딩하여 저장
            const ivBase64 = arrayBufferToBase64(iv);

            // 로그인 정보 저장
            chrome.storage.local.set({
                iv: ivBase64,
                encryptedUsername: encryptedUsernameBase64,
                encryptedPassword: encryptedPasswordBase64
            }, () => {
                console.log('로그인 정보가 저장되었습니다.');

                // 크롤링 시작
                chrome.runtime.sendMessage({ action: 'start_crawling' }, (response) => {
                    if (response.status === 'success') {
                        console.log('크롤링 시작');
                    }
                });
            });

        } catch (error) {
            console.error('암호화 중 오류 발생:', error);
            alert('로그인 정보를 암호화하는 중 오류가 발생했습니다.');
        }
    } else if (!username && !password) {
        // 로그인 정보 없이 알람 간격 및 제외 분류만 저장한 경우
        console.log('로그인 정보 없이 알람 설정이 저장되었습니다.');
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