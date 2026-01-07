import { useState, useEffect } from 'react';
import './ApiKeyInput.css';

const ApiKeyInput = ({ onKeyChange }) => {
    const [apiKey, setApiKey] = useState('');
    const [isVisible, setIsVisible] = useState(false);

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
        alert('API Key가 저장되었습니다.');
    };

    const handleClear = () => {
        localStorage.removeItem('removebg_api_key');
        setApiKey('');
        onKeyChange('');
    };

    return (
        <div className="api-key-container">
            <div className="api-key-header" onClick={() => setIsVisible(!isVisible)}>
                <span>🔑 Remove.bg API 설정</span>
                <span className="toggle-icon">{isVisible ? '▲' : '▼'}</span>
            </div>

            {isVisible && (
                <div className="api-key-body">
                    <p className="description">
                        고품질 배경 제거를 위해 <a href="https://www.remove.bg/api" target="_blank" rel="noreferrer">remove.bg API Key</a>가 필요합니다.
                    </p>
                    <div className="input-group">
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="API Key를 입력하세요"
                        />
                        <button onClick={handleSave} className="btn-save">저장</button>
                        <button onClick={handleClear} className="btn-clear">삭제</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApiKeyInput;
