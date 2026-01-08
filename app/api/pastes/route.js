import getPool from '@/lib/db';
import { nanoid } from 'nanoid';
import { validateCreatePaste } from '@/lib/validation';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateCreatePaste(body);
    if (!validation.success) {
      return Response.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error
        }
      }, { status: 400 });
    }

    const { content, title, expiresIn, maxViews } = validation.data;

    // Generate unique ID
    const id = nanoid(10);

    // Calculate expiration timestamp
    let expiresAt = null;
    if (expiresIn) {
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + expiresIn);
      expiresAt = expirationDate;
    }

    // Insert into database
    const result = await getPool().query(
      `INSERT INTO pastes (id, title, content, expires_at, max_views, view_count)
       VALUES ($1, $2, $3, $4, $5, 0)
       RETURNING id, title, created_at, expires_at`,
      [id, title || 'Untitled', content, expiresAt, maxViews]
    );

    const paste = result.rows[0];

    // Generate shareable URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin');
    const url = `${baseUrl}?id=${id}`;

    return Response.json({
      success: true,
      data: {
        id: paste.id,
        title: paste.title,
        url: url,
        createdAt: paste.created_at,
        expiresAt: paste.expires_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating paste:', error);
    return Response.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create paste'
      }
    }, { status: 500 });
  }
}