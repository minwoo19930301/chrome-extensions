(async function() {
    const LOGIN_URL = "https://blossom.shinsegae.com/WebSite/Login.aspx";
    const TARGET_URL = "https://blossom.shinsegae.com/WebSite/Basic/Board/BoardList.aspx?system=Board&fdid=45044";
    const PASSPHRASE = "gmarket";

    function isLoginPage() {
        return window.location.href.startsWith(LOGIN_URL);
    }

    function checkLoginAttempt(callback) {
        chrome.storage.local.get(['loginAttempted'], (result) => {
            callback(result.loginAttempted || false);
        });
    }

    function setLoginAttempted(value, callback) {
        chrome.storage.local.set({ 'loginAttempted': value }, () => {
            if (callback) callback();
        });
    }

    async function performLogin() {
        const usernameField = document.getElementById('txtPC_LoginID');
        const passwordField = document.getElementById('txtPC_LoginPW');
        const loginButton = document.getElementById('btnLoginCall');

        if (usernameField && passwordField && loginButton) {
            chrome.storage.local.get(['iv', 'encryptedUsername', 'encryptedPassword'], async (result) => {
                const { iv, encryptedUsername, encryptedPassword } = result;

                if (iv && encryptedUsername && encryptedPassword) {
                    try {
                        const key = await getKey(PASSPHRASE);
                        const ivArray = base64ToArrayBuffer(iv);

                        const decryptedUsername = await decryptData(encryptedUsername, key, ivArray);
                        const decryptedPassword = await decryptData(encryptedPassword, key, ivArray);

                        if (decryptedUsername && decryptedPassword) {
                            usernameField.value = decryptedUsername;
                            passwordField.value = decryptedPassword;

                            usernameField.dispatchEvent(new Event('input', { bubbles: true }));
                            passwordField.dispatchEvent(new Event('input', { bubbles: true }));

                            setLoginAttempted(true, () => {
                                loginButton.click();
                            });
                        } else {
                            handleMissingCredentials();
                        }
                    } catch (error) {
                        handleLoginFailure();
                    }
                } else {
                    handleMissingCredentials();
                }
            });
        } else {
            handleMissingCredentials();
        }
    }

    function handleLoginFailure() {
        chrome.runtime.sendMessage({ action: 'notify_login_error' }, (response) => {});
        chrome.runtime.sendMessage({ action: 'clear_credentials' }, (response) => {});
        setLoginAttempted(false, () => {
            notifyBackgroundToCloseTab();
        });
    }

    function handleMissingCredentials() {
        chrome.runtime.sendMessage({ action: 'notify_missing_credentials' }, (response) => {});
        setLoginAttempted(false, () => {
            notifyBackgroundToCloseTab();
        });
    }

    function navigateToTargetPage() {
        window.location.href = TARGET_URL;
    }

    function isTargetPage() {
        return window.location.href.includes("BoardList.aspx");
    }

    function resetLoginAttempt() {
        setLoginAttempted(false);
    }

    function scrapeData() {
        const table = document.getElementById('cphContent_cphContent_grid');
        if (!table) {
            return null;
        }

        const tbody = table.querySelector('tbody');
        if (!tbody) {
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

        return data;
    }

    function sendData(data) {
        if (data && data.length > 0) {
            chrome.runtime.sendMessage({ action: 'send_data', data: data }, (response) => {});
        }
    }

    function notifyBackgroundToCloseTab() {
        chrome.runtime.sendMessage({ action: 'content_finished' }, (response) => {});
    }

    async function main() {
        if (isLoginPage()) {
            checkLoginAttempt((attempted) => {
                if (!attempted) {
                    performLogin();
                } else {
                    handleLoginFailure();
                }
            });
        }
        else if (isTargetPage()) {
            resetLoginAttempt();
            const data = scrapeData();
            sendData(data);
            notifyBackgroundToCloseTab();
        }
        else {
            notifyBackgroundToCloseTab();
        }
    }

    window.addEventListener('load', () => {
        setTimeout(main, 100);
    });

})();