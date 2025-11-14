// src/app/api/image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getModelById } from '@/config/models';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        console.log('🔥 Image API: Payment verified by X402 middleware (if configured)');

        const body = await request.json();
        const { model, prompt } = body as { model: string; prompt: string };

        if (!prompt || typeof prompt !== 'string') {
            throw new Error('Missing prompt');
        }

        const modelConfig = getModelById(model);
        if (!modelConfig) {
            throw new Error(`Unknown model: ${model}`);
        }
        if (!modelConfig.capabilities.includes('image')) {
            throw new Error(`Model ${modelConfig.id} does not support image generation`);
        }

        const dataUrl = await callImageModel(modelConfig.provider, modelConfig.version, prompt);

        const response = {
            success: true,
            image: dataUrl,
            model: modelConfig.id,
            // You can mirror ChatResponse structure if you want cost / metadata
            timestamp: new Date().toISOString(),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Image API error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'An unexpected error occurred',
                },
            },
            { status: 500 },
        );
    }
}

// Provider switch, just like callAIModel
async function callImageModel(
    provider: string,
    modelVersion: string,
    prompt: string,
): Promise<string> {
    switch (provider) {
        case 'openai':
            return callOpenAIImage(modelVersion, prompt);
        case 'google':
            return callGeminiImage(modelVersion, prompt);
        default:
            throw new Error(`Unsupported image provider: ${provider}`);
    }
}

// OpenAI image (DALL·E 3)
async function callOpenAIImage(model: string, prompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            prompt,
            size: '1024x1024',
            response_format: 'b64_json',
        }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'OpenAI image generation failed');
    }

    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image returned from OpenAI');
    return `data:image/png;base64,${b64}`;
}

type GeminiInlineData = {
    mimeType?: string;
    data?: string;
};

type GeminiPart = {
    inlineData?: GeminiInlineData;
};

// Gemini image (Gemini 2.0 Flash with image capability)
async function callGeminiImage(model: string, prompt: string): Promise<string> {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not set');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }],
                },
            ],
        }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'Gemini image generation failed');
    }

    const candidates = data.candidates ?? [];
    const first = candidates[0];
    const parts = (first?.content?.parts ?? []) as GeminiPart[];
    const imgPart = parts.find(
        (p) => p.inlineData?.mimeType?.startsWith('image/'),
    );
    if (!imgPart?.inlineData?.data) throw new Error('No image data returned from Gemini');

    const mimeType = imgPart.inlineData.mimeType || 'image/png';
    const b64 = imgPart.inlineData.data;
    return `data:${mimeType};base64,${b64}`;
}
