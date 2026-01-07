// import { removeBackground } from '@imgly/background-removal'; // Legacy local removal

export const processImage = async (imageSrc, apiKey) => {
    if (!apiKey) {
        throw new Error("API Key가 필요합니다.");
    }

    try {
        // 1. Convert local blob URL or base64 to Blob if needed
        const response = await fetch(imageSrc);
        const blob = await response.blob();

        // 2. Prepare FormData for Remove.bg API
        const formData = new FormData();
        formData.append('image_file', blob);
        formData.append('size', 'auto');
        formData.append('format', 'png'); // Explicitly request PNG for transparency

        // 3. Call API
        const apiResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': apiKey,
            },
            body: formData,
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            throw new Error(errorData.errors?.[0]?.title || '배경 제거 실패');
        }

        // 4. Create Object URL from response blob
        const resultBlob = await apiResponse.blob();
        return URL.createObjectURL(resultBlob);

    } catch (error) {
        console.error('Background removal failed:', error);
        throw error;
    }
};
