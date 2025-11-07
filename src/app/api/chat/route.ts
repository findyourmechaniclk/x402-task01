// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { x402PaymentMiddleware } from '@/middleware/x402';
import { getModelById } from '@/config/models';
import type { ChatRequest, ChatResponse } from '@/types/chat';

export async function POST(request: NextRequest) {
    try {
        // Apply X402 payment verification middleware
        const paymentResponse = await x402PaymentMiddleware(request);
        if (paymentResponse) {
            // Payment required or failed - return the payment response
            return paymentResponse;
        }

        // Payment verified - proceed with chat request
        const body: ChatRequest = await request.json();
        const { model, message, conversationId, systemPrompt } = body;

        // Validate request (already done in middleware, but double-check)
        if (!model || !message) {
            return NextResponse.json({
                success: false,
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'Model and message are required'
                }
            } as ChatResponse, { status: 400 });
        }

        // Get model configuration
        const modelConfig = getModelById(model);
        if (!modelConfig || !modelConfig.enabled) {
            return NextResponse.json({
                success: false,
                error: {
                    code: 'MODEL_NOT_AVAILABLE',
                    message: `Model '${model}' is not available`
                }
            } as ChatResponse, { status: 404 });
        }

        console.log(`🤖 Processing verified chat request: ${model} - "${message.substring(0, 50)}..."`);

        // Call appropriate AI model
        const aiResponse = await callAIModel(modelConfig.provider, model, message, systemPrompt);

        // Calculate actual cost based on response
        const inputTokens = Math.ceil(message.length / 4);
        const outputTokens = Math.ceil(aiResponse.text.length / 4);
        const actualCost = modelConfig.pricing.baseRequest +
            (inputTokens * modelConfig.pricing.perToken.input) +
            (outputTokens * modelConfig.pricing.perToken.output);

        const response: ChatResponse = {
            success: true,
            response: aiResponse.text,
            cost: {
                amount: Math.round(actualCost * 10000) / 10000,
                currency: 'USDC',
                tokens: {
                    input: inputTokens,
                    output: outputTokens
                }
            },
            timestamp: new Date().toISOString()
        };

        console.log(`✅ Chat response generated: ${outputTokens} tokens, ${actualCost} USDC`);
        return NextResponse.json(response);

    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : 'An unexpected error occurred'
            }
        } as ChatResponse, { status: 500 });
    }
}

// AI Model calling functions (same as existing implementation)
async function callAIModel(
    provider: string,
    model: string,
    message: string,
    systemPrompt?: string
): Promise<{ text: string }> {
    const messages = [];

    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: message });

    switch (provider) {
        case 'openai':
            return await callOpenAI(model, messages);
        case 'google':
            return await callGemini(model, message);
        case 'anthropic':
            return await callClaude(model, messages);
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

async function callOpenAI(model: string, messages: any[]): Promise<{ text: string }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: 1000,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return { text: data.choices[0]?.message?.content || 'No response generated' };
}

async function callGemini(model: string, message: string): Promise<{ text: string }> {
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
                generationConfig: {
                    maxOutputTokens: 1000,
                    temperature: 0.7
                }
            })
        }
    );

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return { text: data.candidates[0]?.content?.parts[0]?.text || 'No response generated' };
}

async function callClaude(model: string, messages: any[]): Promise<{ text: string }> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('Claude API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model,
            max_tokens: 1000,
            messages: messages.filter(m => m.role !== 'system'),
            system: messages.find(m => m.role === 'system')?.content
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Claude API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return { text: data.content[0]?.text || 'No response generated' };
}