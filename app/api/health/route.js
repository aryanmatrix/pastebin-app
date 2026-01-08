import pool from '@/lib/db';

export async function GET() {
  try {
  
    const result = await pool.query('SELECT NOW()');
    
    return Response.json({
      success: true,
      status: 'healthy',
      timestamp: result.rows[0].now,
      database: 'connected'
    });
  } catch (error) {
    return Response.json({
      success: false,
      status: 'unhealthy',
      error: 'Database connection failed'
    }, { status: 503 });
  }
}