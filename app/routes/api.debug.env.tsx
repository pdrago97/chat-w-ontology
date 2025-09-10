import { json, type LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = async () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    return json({
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      supabaseUrlPrefix: supabaseUrl ? supabaseUrl.substring(0, 20) + "..." : "missing",
      supabaseKeyPrefix: supabaseKey ? supabaseKey.substring(0, 20) + "..." : "missing",
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
};
