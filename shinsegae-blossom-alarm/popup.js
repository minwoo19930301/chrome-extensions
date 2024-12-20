// popup.js

document.getElementById('save').addEventListener('click', saveCredentials);
// 기존 이벤트 리스너들...

// 암호화 키 패스프레이즈
const PASSPHRASE = "gmarket";

// 팝업 로드 시 알람 간격과 제외 분류, 로그인 정보 불러오기
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['alarmInterval', 'excludedCategories', 'iv', 'encryptedUsername', 'encryptedPassword'], async (result) => {
        // 알람 간격 복원
        const interval = result.alarmInterval || 1;
        document.getElementById('interval').value = interval;

        // 제외 분류 체크박스 상태 복원
        const excludedCategories = result.excludedCategories || [];
        const checkboxes = document.querySelectorAll('#excludedCategoriesContainer input[type="checkbox"]');
        const selectAllCheckbox = document.getElementById('selectAll');
        const categoryCheckboxes = Array.from(checkboxes).filter(cb => cb.id !== 'selectAll');

        checkboxes.forEach((checkbox) => {
            if (excludedCategories.includes(checkbox.value)) {
                checkbox.checked = true;
            }
        });

        // '전체' 체크박스 상태 설정
        if (categoryCheckboxes.every(cb => cb.checked)) {
            selectAllCheckbox.checked = true;
        } else {
            selectAllCheckbox.checked = false;
        }

        // 로그인 정보 복원
        if (result.iv && result.encryptedUsername && result.encryptedPassword) {
            try {
                const key = await getKey(PASSPHRASE);
                const ivArray = base64ToArrayBuffer(result.iv);
                const decryptedUsername = await decryptData(result.encryptedUsername, key, ivArray);
                const decryptedPassword = await decryptData(result.encryptedPassword, key, ivArray);

                document.getElementById('username').value = decryptedUsername;
                document.getElementById('password').value = decryptedPassword;
            } catch (error) {
                console.error('로그인 정보 복호화 중 오류 발생:', error);
            }
        }
    });
});

// '전체' 체크박스 클릭 시 동작
document.getElementById('selectAll').addEventListener('change', function() {
    const isChecked = this.checked;
    const checkboxes = document.querySelectorAll('#excludedCategoriesContainer input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
        checkbox.checked = isChecked;
    });
});

// 다른 체크박스 클릭 시 '전체' 체크박스 상태 변경
const categoryCheckboxes = document.querySelectorAll('#excludedCategoriesContainer input[type="checkbox"]:not(#selectAll)');
categoryCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', function() {
        const selectAllCheckbox = document.getElementById('selectAll');
        const allChecked = Array.from(categoryCheckboxes).every(cb => cb.checked);
        if (allChecked) {
            selectAllCheckbox.checked = true;
        } else {
            selectAllCheckbox.checked = false;
        }
    });
});

// 암호화 및 저장 함수
async function saveCredentials() {
    // 로그인 정보와 알람 간격 가져오기
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const intervalInput = document.getElementById('interval').value.trim();

    let interval = parseInt(intervalInput, 10);
    if (isNaN(interval) || interval < 1) {
        interval = 1; // 유효하지 않은 값이면 기본값 1분으로 설정
    }

    // 제외할 분류 목록 가져오기
    const checkboxes = document.querySelectorAll('#excludedCategoriesContainer input[type="checkbox"]:not(#selectAll)');
    const selectAllChecked = document.getElementById('selectAll').checked;
    let excludedCategories = [];

    if (selectAllChecked) {
        // '전체'가 체크된 경우 모든 분류를 제외 목록에 추가
        excludedCategories = Array.from(checkboxes).map(checkbox => checkbox.value);
    } else {
        // 체크된 분류만 제외 목록에 추가
        excludedCategories = Array.from(checkboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);
    }

    // 알람 간격과 제외 분류 저장
    chrome.storage.local.set({ alarmInterval: interval, excludedCategories: excludedCategories }, () => {
        console.log('알람 간격과 제외 분류가 저장되었습니다.');

        // 저장 시 notifiedPostNumbers 초기화
        chrome.storage.local.remove('notifiedPostNumbers', () => {
            console.log('notifiedPostNumbers가 초기화되었습니다.');
        });

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
        // 로그인 정보 없이 알람 설정만 저장한 경우
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