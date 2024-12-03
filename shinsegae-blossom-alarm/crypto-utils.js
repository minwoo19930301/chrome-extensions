// crypto-utils.js

// 암호화 키 파생 함수
async function getKey(password) {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    const key = await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: encoder.encode("unique-salt"), // 고유한 솔트를 사용하세요
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );

    return key;
}

// 문자열을 ArrayBuffer로 변환하는 함수
function stringToArrayBuffer(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

// ArrayBuffer를 문자열로 변환하는 함수
function arrayBufferToString(buffer) {
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
}

// ArrayBuffer를 Base64로 변환하는 함수
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => binary += String.fromCharCode(b));
    return window.btoa(binary);
}

// Base64를 ArrayBuffer로 변환하는 함수
function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// 데이터 암호화 함수
async function encryptData(data, key, iv) {
    const encodedData = stringToArrayBuffer(data);
    const encryptedData = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encodedData
    );
    return arrayBufferToBase64(encryptedData);
}

// 데이터 복호화 함수
async function decryptData(encryptedDataBase64, key, iv) {
    const encryptedData = base64ToArrayBuffer(encryptedDataBase64);
    const decryptedData = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encryptedData
    );
    return arrayBufferToString(decryptedData);
}