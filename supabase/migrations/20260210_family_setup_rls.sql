-- Ensure parent setup tables are writable/readable for authenticated users.
-- This fixes account setup failures when creating first child profiles.

-- Backfill missing profile rows for existing auth users.
INSERT INTO public.profiles (id, email)
SELECT u.id, u.email
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- Ensure each family creator is linked as an admin member.
INSERT INTO public.family_members (family_id, profile_id, role)
SELECT f.id, f.created_by, 'admin'
FROM public.families f
WHERE f.created_by IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.family_id = f.id
        AND fm.profile_id = f.created_by
  );

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles select own'
    ) THEN
        CREATE POLICY "Profiles select own"
        ON public.profiles
        FOR SELECT
        TO authenticated
        USING (id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles insert own'
    ) THEN
        CREATE POLICY "Profiles insert own"
        ON public.profiles
        FOR INSERT
        TO authenticated
        WITH CHECK (id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles update own'
    ) THEN
        CREATE POLICY "Profiles update own"
        ON public.profiles
        FOR UPDATE
        TO authenticated
        USING (id = auth.uid())
        WITH CHECK (id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'families' AND policyname = 'Families select member or owner'
    ) THEN
        CREATE POLICY "Families select member or owner"
        ON public.families
        FOR SELECT
        TO authenticated
        USING (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1
                FROM public.family_members fm
                WHERE fm.family_id = public.families.id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'families' AND policyname = 'Families insert own'
    ) THEN
        CREATE POLICY "Families insert own"
        ON public.families
        FOR INSERT
        TO authenticated
        WITH CHECK (created_by = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'families' AND policyname = 'Families update owner'
    ) THEN
        CREATE POLICY "Families update owner"
        ON public.families
        FOR UPDATE
        TO authenticated
        USING (created_by = auth.uid())
        WITH CHECK (created_by = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'family_members' AND policyname = 'Family members select own'
    ) THEN
        CREATE POLICY "Family members select own"
        ON public.family_members
        FOR SELECT
        TO authenticated
        USING (profile_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'family_members' AND policyname = 'Family members insert self into own family'
    ) THEN
        CREATE POLICY "Family members insert self into own family"
        ON public.family_members
        FOR INSERT
        TO authenticated
        WITH CHECK (
            profile_id = auth.uid()
            AND EXISTS (
                SELECT 1
                FROM public.families f
                WHERE f.id = public.family_members.family_id
                  AND f.created_by = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'child_profiles' AND policyname = 'Child profiles family read'
    ) THEN
        CREATE POLICY "Child profiles family read"
        ON public.child_profiles
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.family_members fm
                WHERE fm.family_id = public.child_profiles.family_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'child_profiles' AND policyname = 'Child profiles family insert'
    ) THEN
        CREATE POLICY "Child profiles family insert"
        ON public.child_profiles
        FOR INSERT
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.family_members fm
                WHERE fm.family_id = public.child_profiles.family_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'child_profiles' AND policyname = 'Child profiles family update'
    ) THEN
        CREATE POLICY "Child profiles family update"
        ON public.child_profiles
        FOR UPDATE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.family_members fm
                WHERE fm.family_id = public.child_profiles.family_id
                  AND fm.profile_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.family_members fm
                WHERE fm.family_id = public.child_profiles.family_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;
END $$;
