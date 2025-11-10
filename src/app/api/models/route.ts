import { NextResponse } from 'next/server';
import { getAvailableModels } from '@/config/models';

export async function GET() {
    try {
        const models = getAvailableModels();

        return NextResponse.json({
            success: true,
            models,
            count: models.length,
        });
    } catch (error) {
        console.error('Models API error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to fetch models',
                },
            },
            { status: 500 }
        );
    }
}