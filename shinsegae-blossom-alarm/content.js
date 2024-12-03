// content.js

(async function() {
    const LOGIN_URL = "https://blossom.shinsegae.com/WebSite/Login.aspx";
    const TARGET_URL = "https://blossom.shinsegae.com/WebSite/Basic/Board/BoardList.aspx?system=Board&fdid=45044";

    // 암호화 키 패스프레이즈
    const PASSPHRASE = "gmarket";

    // 로그인 페이지인지 확인하는 함수
    function isLoginPage() {
        return window.location.href.startsWith(LOGIN_URL);
    }

    // 로그인 수행 함수
    async function performLogin(encryptedUsernameBase64, encryptedPasswordBase64, ivBase64) {
        const usernameField = document.getElementById('txtPC_LoginID');
        const passwordField = document.getElementById('txtPC_LoginPW');
        const loginButton = document.getElementById('btnLoginCall');

        if (usernameField && passwordField && loginButton) {
            console.log('로그인 요소 찾음. 로그인 시도 중...');

            try {
                const key = await getKey(PASSPHRASE);
                const iv = base64ToArrayBuffer(ivBase64);

                // 복호화
                const decryptedUsername = await decryptData(encryptedUsernameBase64, key, iv);
                const decryptedPassword = await decryptData(encryptedPasswordBase64, key, iv);

                if (decryptedUsername && decryptedPassword) {
                    usernameField.value = decryptedUsername;
                    passwordField.value = decryptedPassword;

                    // 이벤트 트리거
                    usernameField.dispatchEvent(new Event('input', { bubbles: true }));
                    passwordField.dispatchEvent(new Event('input', { bubbles: true }));

                    // 로그인 버튼 클릭
                    loginButton.click();

                    console.log('로그인 버튼 클릭 이벤트 발생.');
                } else {
                    console.log('복호화된 로그인 정보가 유효하지 않습니다.');
                    chrome.runtime.sendMessage({ action: 'notify_missing_credentials' }, (response) => {
                        if (response.status !== 'success') {
                            console.log('로그인 정보 누락 알림 전송 실패.');
                        }
                    });
                }
            } catch (error) {
                console.error('로그인 정보 복호화 중 오류 발생:', error);
                chrome.runtime.sendMessage({ action: 'notify_login_error' }, (response) => {
                    if (response.status !== 'success') {
                        console.log('로그인 오류 알림 전송 실패.');
                    }
                });
            }
        } else {
            console.log('로그인 요소를 찾을 수 없습니다.');
        }
    }

    // 로그인 실패 감지 함수
    function detectLoginFailure() {
        const errorElement = document.querySelector('.error-message');
        if (errorElement && errorElement.textContent.includes('로그인 실패')) {
            console.log('로그인 실패 감지.');
            chrome.runtime.sendMessage({ action: 'notify_login_error' }, (response) => {
                if (response.status !== 'success') {
                    console.log('로그인 오류 알림 전송 실패.');
                }
            });
        }
    }

    // 대상 페이지인지 확인하는 함수
    function isTargetPage() {
        return window.location.href.startsWith(TARGET_URL);
    }

    // 테이블 데이터 크롤링 함수
    function scrapeData() {
        const table = document.getElementById('cphContent_cphContent_grid');
        if (!table) {
            console.log('게시판 테이블을 찾을 수 없습니다.');
            return null;
        }

        const tbody = table.querySelector('tbody');
        if (!tbody) {
            console.log('게시판 테이블의 tbody를 찾을 수 없습니다.');
            return null;
        }

        const rows = Array.from(tbody.querySelectorAll('tr'));
        const data = [];

        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length >= 6) {
                const number = cols[0].textContent.trim();
                const category = cols[1].textContent.trim();
                const productGroup = cols[2].textContent.trim();
                const promotionNameElement = cols[3].querySelector('a');
                const promotionName = promotionNameElement ? promotionNameElement.textContent.trim() : cols[3].textContent.trim();
                const creator = cols[4].textContent.trim();
                const postDateElement = cols[5].querySelector('.grv_date');
                const postDate = postDateElement ? postDateElement.textContent.trim() : cols[5].textContent.trim();

                data.push({
                    number,
                    category,
                    productGroup,
                    promotionName,
                    creator,
                    postDate
                });
            }
        });

        console.log('스크래핑된 데이터:', data);
        return data;
    }

    // 백그라운드로 데이터 전송 함수
    function sendData(data) {
        if (data && data.length > 0) {
            chrome.runtime.sendMessage({ action: 'send_data', data: data }, (response) => {
                if (response && response.status === 'success') {
                    console.log('데이터가 백그라운드로 전송되었습니다.');
                } else {
                    console.log('데이터 전송 실패.');
                }
            });
        } else {
            console.log('크롤링된 데이터가 없습니다.');
        }
    }

    // 작업 완료 후 백그라운드로 메시지 전송하여 탭 닫기 요청
    function notifyBackgroundToCloseTab() {
        chrome.runtime.sendMessage({ action: 'content_finished' }, (response) => {
            if (response && response.status === 'success') {
                console.log('백그라운드에 탭 닫기 요청을 보냈습니다.');
            } else {
                console.log('탭 닫기 요청 전송 실패.');
            }
        });
    }

    // 메인 실행 함수
    async function main() {
        if (isLoginPage()) {
            console.log('로그인 페이지 감지. 자동으로 로그인 시도합니다.');

            // URL 파라미터에서 암호화된 로그인 정보 및 IV 추출
            const urlParams = new URLSearchParams(window.location.search);
            const ivBase64 = urlParams.get('iv');
            const encryptedUsernameBase64 = urlParams.get('blossom_username');
            const encryptedPasswordBase64 = urlParams.get('blossom_password');

            if (ivBase64 && encryptedUsernameBase64 && encryptedPasswordBase64) {
                await performLogin(encryptedUsernameBase64, encryptedPasswordBase64, ivBase64);

                // 로그인 시도 후 3초 후에 로그인 실패 여부 확인
                setTimeout(detectLoginFailure, 3000);
            } else {
                console.log('URL에 암호화된 로그인 정보가 없습니다.');
                chrome.runtime.sendMessage({ action: 'notify_missing_credentials' }, (response) => {
                    if (response.status !== 'success') {
                        console.log('로그인 정보 누락 알림 전송 실패.');
                    }
                });
            }
        }
        else if (isTargetPage()) {
            console.log('대상 페이지 감지. 데이터 크롤링을 시작합니다.');
            const data = scrapeData();
            sendData(data);

            // 작업 완료 후 백그라운드에 탭 닫기 요청
            notifyBackgroundToCloseTab();
        }
        else {
            console.log('해당 페이지에서는 동작하지 않습니다.');
        }
    }

    // 페이지 로드 후 실행
    window.addEventListener('load', () => {
        // 약간의 지연을 두어 페이지 요소들이 로드되도록 함
        setTimeout(main, 100);
    });

})();