(async () => {
    try {
        console.log('콘텐츠 스크립트가 실행되었습니다.');

        const { userId, password } = await new Promise((resolve) => {
            chrome.storage.local.get(['userId', 'password'], resolve);
        });

        if (!userId || !password) {
            console.error('저장된 로그인 정보가 없습니다.');
            return;
        }

        console.log('로그인 정보를 가져왔습니다.');

        window.addEventListener('load', async function() {
            console.log('페이지 로드 완료');

            // 실제 로그인 페이지의 요소 선택자 확인 및 수정 필요
            const userIdField = document.querySelector('#txtUserId');
            const passwordField = document.querySelector('#txtPassword');
            const loginButton = document.querySelector('#btnLogin');

            if (userIdField && passwordField && loginButton) {
                userIdField.value = userId;
                passwordField.value = password;

                console.log('아이디와 비밀번호를 입력했습니다.');

                loginButton.click();

                console.log('로그인 버튼을 클릭했습니다.');

                // 로그인 후 데이터 수집
                const checkLogin = setInterval(async () => {
                    if (!window.location.href.includes('Login.aspx')) {
                        clearInterval(checkLogin);
                        console.log('로그인 성공');

                        // 데이터 가져오기
                        await fetchData();
                    } else {
                        console.log('로그인 대기 중...');
                    }
                }, 1000);
            } else {
                console.error('로그인 폼 요소를 찾을 수 없습니다.');
            }
        });

        async function fetchData() {
            try {
                console.log('데이터 요청 중...');

                const response = await fetch('https://blossom.shinsegae.com/WebSite/Basic/Board/BoardList.aspx?system=Board&fdid=45044', {
                    credentials: 'include',
                });

                if (response.ok) {
                    const text = await response.text();
                    console.log('데이터 가져오기 성공');
                    parseData(text);

                    // 탭 닫기
                    chrome.runtime.sendMessage({ action: 'closeTab' });
                } else {
                    console.error('데이터 가져오기 실패:', response.statusText);
                }
            } catch (error) {
                console.error('데이터 요청 오류:', error);
            }
        }

        function parseData(htmlText) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            // 원하는 테이블 선택 (실제 선택자로 수정 필요)
            const table = doc.querySelector('#yourTableSelector');

            if (table) {
                console.log('테이블 데이터를 성공적으로 추출했습니다.');
                console.log(table.innerText);
            } else {
                console.error('테이블을 찾을 수 없습니다.');
            }
        }
    } catch (error) {
        console.error('로그인 과정에서 오류 발생:', error);
    }
})();