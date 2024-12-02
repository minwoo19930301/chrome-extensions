// background.js

// 로그인 정보 설정
const userId = 'YOUR_USER_ID'; // 실제 아이디로 변경
const password = 'YOUR_PASSWORD'; // 실제 비밀번호로 변경

// 로그인 및 페이지 가져오기 함수
async function loginAndFetchPage() {
    try {
        // 로그인 데이터 설정
        const loginData = new URLSearchParams();
        loginData.append('txtEmpNo', userId);
        loginData.append('txtPasswd', password);
        loginData.append('cmd', 'login');

        // 로그인 요청
        const loginResponse = await fetch('https://blossom.shinsegae.com/WebSite/Login.aspx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: loginData.toString(),
            credentials: 'include'
        });

        if (loginResponse.ok) {
            console.log('로그인 요청 성공');
            const loginText = await loginResponse.text();

            // 로그인 성공 여부 확인 (응답 내용에 따라 수정 필요)
            if (!loginText.includes('txtEmpNo')) {
                console.log('로그인 성공');

                // 원하는 페이지 요청
                const pageResponse = await fetch('https://blossom.shinsegae.com/WebSite/Basic/Board/BoardList.aspx?system=Board&fdid=45044', {
                    credentials: 'include'
                });

                if (pageResponse.ok) {
                    const pageText = await pageResponse.text();
                    console.log('페이지 가져오기 성공');
                    console.log(pageText); // 페이지 HTML 출력
                } else {
                    console.error('페이지 가져오기 실패:', pageResponse.statusText);
                }
            } else {
                console.error('로그인 실패: 아이디 또는 비밀번호를 확인하세요.');
            }
        } else {
            console.error('로그인 요청 실패:', loginResponse.statusText);
        }
    } catch (error) {
        console.error('로그인 또는 페이지 가져오기 오류:', error);
    }
}

// 확장 프로그램이 로드되면 로그인 및 페이지 가져오기 실행
loginAndFetchPage();