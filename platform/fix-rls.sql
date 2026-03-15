-- Create a security definer function to check admin status (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Fix profiles admin policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

-- Fix enrollments admin policies
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;
CREATE POLICY "Admins can view all enrollments"
  ON public.enrollments FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can create enrollments" ON public.enrollments;
CREATE POLICY "Admins can create enrollments"
  ON public.enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Fix progress admin policy
DROP POLICY IF EXISTS "Admins can view all progress" ON public.progress;
CREATE POLICY "Admins can view all progress"
  ON public.progress FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Fix payments admin policy
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Fix courses admin policy
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins can manage courses"
  ON public.courses FOR ALL
  USING (public.is_admin());
