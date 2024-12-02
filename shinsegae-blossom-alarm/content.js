// content.js

// 🚨 임시 로그인 정보 (실제 사용 시 보안 강화 필요)
const USERNAME = '120221104'; // 여기에 실제 아이디 입력
const PASSWORD = 'Rla48684!'; // 여기에 실제 비밀번호 입력

// 로그인 페이지인지 확인하는 함수
function isLoginPage() {
    return document.getElementById('txtPC_LoginID') && document.getElementById('txtPC_LoginPW');
}

// 로그인 수행 함수
function performLogin() {
    const usernameField = document.getElementById('txtPC_LoginID');
    const passwordField = document.getElementById('txtPC_LoginPW');
    const loginButton = document.getElementById('btnLoginCall');

    if (usernameField && passwordField && loginButton) {
        usernameField.value = USERNAME;
        passwordField.value = PASSWORD;

        // 이벤트 트리거 (필요 시)
        usernameField.dispatchEvent(new Event('input', { bubbles: true }));
        passwordField.dispatchEvent(new Event('input', { bubbles: true }));

        // 로그인 버튼 클릭
        loginButton.click();
    }
}

// 대상 페이지인지 확인하는 함수
function isTargetPage() {
    return window.location.href.includes('/WebSite/Basic/Board/BoardList.aspx?system=Board&fdid=45044');
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

    const rows = tbody.querySelectorAll('tr');
    const data = [];

    rows.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 6) {
            const number = cols[0].textContent.trim();
            const category = cols[1].textContent.trim();
            const productGroup = cols[2].textContent.trim();
            const promotionName = cols[3].textContent.trim();
            const creator = cols[4].textContent.trim();
            const postDate = cols[5].textContent.trim();

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

    return data;
}

// 백그라운드로 데이터 전송 함수
function sendData(data) {
    if (data && data.length > 0) {
        chrome.runtime.sendMessage({ action: 'send_data', data: data });
    } else {
        console.log('크롤링된 데이터가 없습니다.');
    }
}

// 메인 실행 함수
function main() {
    if (isLoginPage()) {
        console.log('로그인 페이지 감지. 자동으로 로그인 시도합니다.');
        performLogin();
    } else if (isTargetPage()) {
        console.log('대상 페이지 감지. 데이터 크롤링을 시작합니다.');
        const data = scrapeData();
        sendData(data);
    } else {
        console.log('해당 페이지에서는 동작하지 않습니다.');
    }
}

// 페이지 로드 후 실행
window.addEventListener('load', () => {
    // 약간의 지연을 두어 페이지 요소들이 로드되도록 함
    setTimeout(main, 1000);
});