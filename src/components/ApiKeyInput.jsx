import { useState, useEffect } from 'react';
import './ApiKeyInput.css';

const ApiKeyInput = ({ onKeyChange }) => {
    const [apiKey, setApiKey] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const storedKey = localStorage.getItem('removebg_api_key');
        if (storedKey) {
            setApiKey(storedKey);
            onKeyChange(storedKey);
        }
    }, [onKeyChange]);

    const handleSave = () => {
        localStorage.setItem('removebg_api_key', apiKey);
        onKeyChange(apiKey);
        setIsOpen(false); // Optional: close after saving? User didn't ask, but it's nice. Let's keep it open or just notify.
        // Actually, let's just save.
        alert("API Key가 저장되었습니다.");
    };

    return (
        <div className="api-key-container">
            <button
                className={`api-toggle-btn ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="btn-content">
                    <img src="/icon_moon.png" alt="icon" className="ui-icon-moon" />
                    <span>Remove.bg API 설정</span>
                </div>
                <img src="/icon_arrow.png" alt="toggle" className="ui-icon-arrow" />
            </button>

            {isOpen && (
                <div className="api-input-wrapper">
                    <p className="description">
                        Remove.bg 웹사이트에서 발급받은 API Key를 입력해주세요.
                        <br />
                        <a href="https://www.remove.bg/api#remove-background" target="_blank" rel="noreferrer">
                            API Key 발급받기
                        </a>
                    </p>
                    <div className="input-group">
                        <div className="input-container">
                            <input
                                type="password"
                                placeholder="API Key 입력"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="api-input"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSave();
                                    }
                                }}
                            />
                            {apiKey && (
                                <button
                                    className="clear-btn"
                                    onClick={() => setApiKey('')}
                                    title="입력 지우기"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            )}
                        </div>
                        <button className="save-btn" onClick={handleSave}>저장</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApiKeyInput;
