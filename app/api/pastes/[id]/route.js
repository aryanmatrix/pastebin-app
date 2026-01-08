import getPool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    // IMPORTANT: In Next.js 15+, params must be awaited
    const { id } = await params;

    // Fetch paste from database
    const result = await getPool().query(
      'SELECT * FROM pastes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return Response.json({
        success: false,
        error: {
          code: 'PASTE_NOT_FOUND',
          message: 'Paste not found'
        }
      }, { status: 404 });
    }

    const paste = result.rows[0];
    const now = new Date();

    // Check if paste has expired (time-based)
    if (paste.expires_at && now > new Date(paste.expires_at)) {
      // Delete expired paste
      await getPool().query('DELETE FROM pastes WHERE id = $1', [id]);
      
      return Response.json({
        success: false,
        error: {
          code: 'PASTE_EXPIRED',
          message: 'This paste has expired'
        }
      }, { status: 410 });
    }

    // Check if paste has reached max views (before incrementing)
    if (paste.max_views && paste.view_count >= paste.max_views) {
      // Delete paste that reached view limit
      await getPool().query('DELETE FROM pastes WHERE id = $1', [id]);
      
      return Response.json({
        success: false,
        error: {
          code: 'PASTE_EXPIRED',
          message: 'This paste has reached its maximum view count'
        }
      }, { status: 410 });
    }

    // Increment view count atomically
    const updateResult = await getPool().query(
      `UPDATE pastes 
       SET view_count = view_count + 1 
       WHERE id = $1 
       RETURNING view_count`,
      [id]
    );

    const newViewCount = updateResult.rows[0].view_count;

    // Check if this was the last allowed view
    const isLastView = paste.max_views && newViewCount >= paste.max_views;
    
    if (isLastView) {
      // Delete after showing one last time
      await getPool().query('DELETE FROM pastes WHERE id = $1', [id]);
    }

    return Response.json({
      success: true,
      data: {
        id: paste.id,
        title: paste.title,
        content: paste.content,
        createdAt: paste.created_at,
        expiresAt: paste.expires_at,
        viewCount: newViewCount,
        maxViews: paste.max_views,
        isLastView: isLastView
      }
    });

  } catch (error) {
    console.error('Error fetching paste:', error);
    return Response.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch paste'
      }
    }, { status: 500 });
  }
}