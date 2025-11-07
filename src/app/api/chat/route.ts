import { NextRequest, NextResponse } from 'next/server';
import { getModelById } from '@/config/models';
import type { ChatRequest, ChatResponse } from '@/types/chat';

export async function POST(request: NextRequest) {
    try {
        const body: ChatRequest = await request.json();
        const { model, message } = body;

        if (!model || !message) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_REQUEST',
                        message: 'Model and message are required',
                    },
                } as ChatResponse,
                { status: 400 }
            );
        }

        // Get model config
        const modelConfig = getModelById(model);
        if (!modelConfig || !modelConfig.available) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'MODEL_NOT_FOUND',
                        message: `Model '${model}' not found or unavailable`,
                    },
                } as ChatResponse,
                { status: 404 }
            );
        }

        // X402 middleware already verified payment
        // Process AI request
        const aiResponse = await callAIModel(modelConfig.provider, model, message);

        const response: ChatResponse = {
            success: true,
            response: aiResponse.text,
            cost: {
                amount: modelConfig.pricing.baseRequest,
                currency: 'USDC',
                tokens: {
                    input: Math.ceil(message.length / 4),
                    output: Math.ceil(aiResponse.text.length / 4),
                },
            },
            timestamp: new Date().toISOString(),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'An unexpected error occurred',
                },
            } as ChatResponse,
            { status: 500 }
        );
    }
}

async function callAIModel(
    provider: string,
    model: string,
    message: string
): Promise<{ text: string }> {
    switch (provider) {
        case 'openai':
            return await callOpenAI(model, message);
        case 'google':
            return await callGemini(model, message);
        case 'anthropic':
            return await callClaude(model, message);
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

async function callOpenAI(model: string, message: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: message }],
            max_tokens: 1000,
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { text: data.choices[0]?.message?.content || 'No response' };
}

async function callGemini(model: string, message: string) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: message }] }],
                generationConfig: { maxOutputTokens: 1000 },
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { text: data.candidates[0]?.content?.parts[0]?.text || 'No response' };
}

async function callClaude(model: string, message: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('Claude API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            max_tokens: 1000,
            messages: [{ role: 'user', content: message }],
        }),
    });

    if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { text: data.content[0]?.text || 'No response' };
}