import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  try {
    // 1. Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
    if (userErr || !userData?.user) throw new Error("Unauthenticated");
    const callerId = userData.user.id;

    // 2. Check if the caller is an admin
    const { data: roleData, error: roleQueryError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .single();
    
    if (roleQueryError || !roleData || roleData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Only administrators can manage users." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse request body
    const body = await req.json();
    const { action } = body;

    if (action === 'createUser') {
      const { email, password, fullName } = body;
      if (!email || !password || !fullName) {
        throw new Error("Missing required parameters: email, password, or fullName.");
      }

      // Create user in auth.users
      const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName.trim(),
          needs_password_change: true,
        }
      });

      if (createError) throw createError;
      if (!newUserData.user) throw new Error("Failed to create user account.");

      const newUserId = newUserData.user.id;

      // Assign role 'client_user'
      const { error: roleError } = await adminClient
        .from('user_roles')
        .insert({ user_id: newUserId, role: 'client_user' });

      if (roleError) {
        // Rollback: delete auth user if role assignment fails
        await adminClient.auth.admin.deleteUser(newUserId);
        throw roleError;
      }

      return new Response(
        JSON.stringify({ user: newUserData.user }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === 'deleteUser') {
      const { userId } = body;
      if (!userId) {
        throw new Error("Missing required parameter: userId.");
      }

      // Delete dependent assignments and roles
      await adminClient.from('client_assignments').delete().eq('user_id', userId);
      await adminClient.from('engagement_assignments').delete().eq('user_id', userId);
      await adminClient.from('engagement_module_assignments').delete().eq('user_id', userId);
      await adminClient.from('user_roles').delete().eq('user_id', userId);

      // Delete from auth.users
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteAuthError) throw deleteAuthError;

      // Delete profile
      await adminClient.from('profiles').delete().eq('id', userId);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      throw new Error(`Unsupported action: ${action}`);
    }

  } catch (error: any) {
    console.error("[manage-users] error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Operation failed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
