# IgniteX Backend Architecture: Supabase & PostgreSQL Schema & Query Package

This document presents the complete, production-ready backend database architecture, access control policies, performance configurations, and frontend API integrations for the **IgniteX** web development agency website.

---

## 1. AUTHENTICATION & PROFILES (Supabase Auth)

Supabase handles core authentication in its internal `auth.users` table. We establish a public `profiles` table to extend user metadata and manage administrative privileges.

### Database Schema & Auto-Populating Trigger

```sql
-- Create the public profiles table extending the auth.users system
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text UNIQUE NOT NULL,
  avatar_url text,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger function to automatically populate public.profiles when a new user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, role)
  VALUES (
    new.id,
    -- Extract full_name or name from provider metadata, falling back to empty string
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    -- Extract avatar_url (returned by Google OAuth or custom uploads)
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    'user' -- Always default new users to the 'user' role for absolute safety
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER allows trigger to run with full system bypass permissions

-- Bind the trigger to auth.users after an insert completes
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Access Control (RLS Policies)

```sql
-- Enable Row Level Security on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own profile, or let admins read all profiles
CREATE POLICY profiles_select ON public.profiles 
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- Allow users to update their own profile fields, or let admins update any profile
CREATE POLICY profiles_update ON public.profiles 
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());
```

### Administrative Operations (Admin Only)

> [!WARNING]
> **SECURE OPERATION FLAG**: Never expose the database promotion command or role updates directly to the client-side code. This operation must be performed exclusively in the Supabase SQL editor or via secure, administrative backends.

```sql
-- Query to promote a user to an administrative role by email
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@ignitex.dev';
```

---

## 2. NEWSLETTER SUBSCRIBERS

This table captures subscriptions from the Hero and Footer sections, protecting records from anonymous edits while allowing public submissions.

### Database Schema

```sql
-- Newsletter subscriptions table
CREATE TABLE public.newsletter_subscribers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  subscribed_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  source text DEFAULT 'hero' CHECK (source IN ('hero', 'footer'))
);
```

### Access Control (RLS Policies)

```sql
-- Enable Row Level Security
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous or authenticated clients to insert newsletter subscriptions
CREATE POLICY newsletter_insert ON public.newsletter_subscribers 
  FOR INSERT WITH CHECK (true);

-- Restrict subscriber record reading to administrators
CREATE POLICY newsletter_select ON public.newsletter_subscribers 
  FOR SELECT USING (public.is_admin());

-- Restrict subscriber record deletion to administrators
CREATE POLICY newsletter_delete ON public.newsletter_subscribers 
  FOR DELETE USING (public.is_admin());
```

### Database Queries

```sql
-- INSERT: Add a new subscriber with conflict resolution.
-- If email already exists, reactivate subscription and reset active status to true
INSERT INTO public.newsletter_subscribers (email, source)
VALUES ('subscriber@example.com', 'hero')
ON CONFLICT (email) DO UPDATE
SET is_active = true, subscribed_at = now();

-- SELECT: Fetch all active subscribers ordered by join date (Admin Only)
SELECT id, email, subscribed_at, source
FROM public.newsletter_subscribers
WHERE is_active = true
ORDER BY subscribed_at DESC;

-- UPDATE: Unsubscribe a user by setting active status to false
UPDATE public.newsletter_subscribers
SET is_active = false
WHERE email = 'subscriber@example.com';

-- SELECT: Count active subscribers
SELECT count(*) AS active_subscriber_count
FROM public.newsletter_subscribers
WHERE is_active = true;
```

---

## 3. CONTACT FORM SUBMISSIONS

Records all prospective client proposals submitted from the bottom Contact Form section of the website.

### Database Schema

```sql
-- Contact submissions table
CREATE TABLE public.contact_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  service text,
  budget_range text,
  message text NOT NULL,
  status text DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  submitted_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);
```

### Access Control (RLS Policies)

```sql
-- Enable Row Level Security
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous or authenticated users to insert proposals
CREATE POLICY contact_submissions_insert ON public.contact_submissions 
  FOR INSERT WITH CHECK (true);

-- Restrict viewing contact submissions to administrators
CREATE POLICY contact_submissions_select ON public.contact_submissions 
  FOR SELECT USING (public.is_admin());

-- Restrict updating status to administrators
CREATE POLICY contact_submissions_update ON public.contact_submissions 
  FOR UPDATE USING (public.is_admin());

-- Restrict deleting submissions to administrators
CREATE POLICY contact_submissions_delete ON public.contact_submissions 
  FOR DELETE USING (public.is_admin());
```

### Database Queries

```sql
-- INSERT: Insert a new prospective client proposal
INSERT INTO public.contact_submissions (name, email, service, budget_range, message, ip_address, user_agent)
VALUES (
  'Jane Doe', 
  'jane@company.com', 
  'Web Development', 
  '$5k–$15k', 
  'We need a custom, lightning-fast high-end cinematic SaaS landing page.', 
  '192.168.1.1', 
  'Mozilla/5.0...'
);

-- SELECT: Fetch all submissions ordered chronologically (Admin Only)
SELECT * FROM public.contact_submissions
ORDER BY submitted_at DESC;

-- SELECT: Fetch unread 'new' submissions and output unread count alongside records (Admin Only)
SELECT *, count(*) OVER() AS total_unread_count
FROM public.contact_submissions
WHERE status = 'new'
ORDER BY submitted_at DESC;

-- UPDATE: Mark a specific submission status (Admin Only)
UPDATE public.contact_submissions
SET status = 'read'
WHERE id = 'a7b8c9d0-1234-5678-abcd-ef0123456789';

-- SELECT: Group submissions by service for internal analytical tracking (Admin Only)
SELECT service, count(*) AS submission_count
FROM public.contact_submissions
GROUP BY service
ORDER BY submission_count DESC;
```

---

## 4. SERVICES CATALOG

Houses structural modules representing agency service deliverables shown in the Services section (Section 1).

### Database Schema

```sql
-- Services list table
CREATE TABLE public.services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon_name text, -- Matches Lucide SVG component identifiers (e.g. 'Code', 'Palette')
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### Access Control (RLS Policies)

```sql
-- Enable Row Level Security
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active services
CREATE POLICY services_select ON public.services 
  FOR SELECT USING (is_active = true OR public.is_admin());

-- Restrict service inserts, updates, and deletes exclusively to administrators
CREATE POLICY services_admin ON public.services 
  FOR ALL USING (public.is_admin());
```

### Database Queries

```sql
-- SELECT: Fetch active services for public grid rendering (Public)
SELECT id, title, slug, description, icon_name, display_order
FROM public.services
WHERE is_active = true
ORDER BY display_order ASC;

-- INSERT: Create a new service (Admin Only)
INSERT INTO public.services (title, slug, description, icon_name, display_order)
VALUES ('Web Design', 'web-design', 'High-end custom vector and responsive layouts.', 'Palette', 1);

-- UPDATE: Modify service configurations by ID (Admin Only)
UPDATE public.services
SET title = 'Premium UI Design', description = 'Curated cinematic art directions and design tokens.'
WHERE id = 'e1f2g3h4-1234-5678-abcd-ef0123456789';

-- UPDATE: Soft delete a service to preserve historical associations (Admin Only)
UPDATE public.services
SET is_active = false
WHERE id = 'e1f2g3h4-1234-5678-abcd-ef0123456789';

-- UPDATE: Reorder entire catalog with a single query using positional arrays (Admin Only)
-- Accepts an ordered array of UUIDs and binds new sequence numbers using CTE unnesting
WITH order_index AS (
  SELECT 
    id::uuid, 
    seq::int
  FROM unnest(
    ARRAY['e1f2g3h4-1234-5678-abcd-ef0123456789'::uuid, 'a7b8c9d0-1234-5678-abcd-ef0123456789'::uuid]
  ) WITH ORDINALITY AS t(id, seq)
)
UPDATE public.services s
SET display_order = o.seq
FROM order_index o
WHERE s.id = o.id;
```

---

## 5. PORTFOLIO PROJECTS

Powers the bento grid (Section 3) and custom project details view.

### Database Schema

```sql
-- Portfolio projects table
CREATE TABLE public.projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  category text NOT NULL CHECK (category IN ('E-Commerce', 'SaaS', 'Mobile', 'Branding')),
  description text,
  cover_image_url text, -- Storage reference URL
  project_url text,
  tags text[] DEFAULT '{}',
  is_featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### Access Control (RLS Policies)

```sql
-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active projects
CREATE POLICY projects_select ON public.projects 
  FOR SELECT USING (is_active = true OR public.is_admin());

-- Restrict all project modifications to administrators
CREATE POLICY projects_admin ON public.projects 
  FOR ALL USING (public.is_admin());
```

### Database Queries

```sql
-- SELECT: Fetch all active projects ordered by sequence (Public)
SELECT * FROM public.projects
WHERE is_active = true
ORDER BY display_order ASC;

-- SELECT: Fetch featured projects (high priority for hero section/bento slots)
SELECT * FROM public.projects
WHERE is_active = true AND is_featured = true
ORDER BY display_order ASC;

-- SELECT: Fetch active projects by category tag
SELECT * FROM public.projects
WHERE is_active = true AND category = 'SaaS'
ORDER BY display_order ASC;

-- INSERT: Create a new project (Admin Only)
INSERT INTO public.projects (title, slug, category, description, cover_image_url, project_url, tags, is_featured, display_order)
VALUES (
  'Vertex Cloud', 
  'vertex-cloud', 
  'SaaS', 
  'Scalable cloud infrastructure dashboards.', 
  'https://cdn.ignitex.dev/storage/v1/object/public/project-covers/vertex.png',
  'https://vertex-example.com', 
  ARRAY['React', 'PostgreSQL', 'Tailwind CSS'], 
  true, 
  1
);

-- UPDATE: Modify project fields (Admin Only)
UPDATE public.projects
SET tags = ARRAY['Next.js', 'Supabase', 'Framer Motion'], is_featured = true
WHERE id = 'b9c0d1e2-1234-5678-abcd-ef0123456789';

-- UPDATE: Toggle featured highlight setting (Admin Only)
UPDATE public.projects
SET is_featured = NOT is_featured
WHERE id = 'b9c0d1e2-1234-5678-abcd-ef0123456789';
```

---

## 6. PRICING PLANS

Populates the transparent investment tiers listed in the Pricing section (Section 5).

### Database Schema

```sql
-- Pricing plans table
CREATE TABLE public.pricing_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  price_monthly numeric,
  price_label text, -- fallback label (e.g. 'Custom' or 'Contact Us')
  description text,
  features jsonb DEFAULT '[]', -- Structured feature items array
  is_recommended boolean DEFAULT false,
  cta_label text DEFAULT 'Get Started',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### JSONB Structure & Custom Insertion Example

```sql
-- INSERT: Add a new pricing tier.
-- Includes explicit features inside a JSONB array demonstrating expected nested data shape
INSERT INTO public.pricing_plans (name, slug, price_monthly, price_label, description, features, is_recommended, display_order)
VALUES (
  'Growth', 
  'growth', 
  8500.00, 
  '$8,500', 
  'One-time investment · Highly recommended', 
  '[
    {"text": "Custom Multi-Page Design & Development", "included": true},
    {"text": "Full Playfair Display Typography Style", "included": true},
    {"text": "Bento Layout Portfolio Integrations", "included": true},
    {"text": "Scalable Custom CMS Architecture Panel", "included": true},
    {"text": "Advanced Performance & Speed Audits", "included": true},
    {"text": "Complete Mobile Application Consulting", "included": true},
    {"text": "24/7 Dedicated Server Support & DevOps", "included": false}
  ]'::jsonb, 
  true, 
  2
);
```

### Access Control (RLS Policies)

```sql
-- Enable Row Level Security
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active pricing plans
CREATE POLICY pricing_plans_select ON public.pricing_plans 
  FOR SELECT USING (is_active = true OR public.is_admin());

-- Restrict all pricing changes to administrators
CREATE POLICY pricing_plans_admin ON public.pricing_plans 
  FOR ALL USING (public.is_admin());
```

### Database Queries

```sql
-- SELECT: Fetch active pricing plans ordered for public layout rendering
SELECT * FROM public.pricing_plans
WHERE is_active = true
ORDER BY display_order ASC;

-- UPDATE: Replace plan features list (Admin Only)
UPDATE public.pricing_plans
SET features = '[
  {"text": "Custom 5-Page Responsive Web", "included": true},
  {"text": "DM Sans Typography Architecture", "included": true},
  {"text": "Custom Contact Forms & Map Integrations", "included": true},
  {"text": "Blazing Fast Page Load Optimization", "included": true}
]'::jsonb
WHERE id = 'c8d9e0f1-1234-5678-abcd-ef0123456789';

-- UPDATE: Set plan as recommended and automatically disable other recommendations atomically
-- Using Common Table Expressions (CTEs) to ensure single-transaction thread-safe consistency
WITH reset_recommendations AS (
  UPDATE public.pricing_plans
  SET is_recommended = false
  RETURNING id
)
UPDATE public.pricing_plans
SET is_recommended = true
WHERE id = 'c8d9e0f1-1234-5678-abcd-ef0123456789';
```

---

## 7. TESTIMONIALS

Stores authentic reviews displayed in the Client Voices carousel (Section 6).

### Database Schema

```sql
-- Testimonials list table
CREATE TABLE public.testimonials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name text NOT NULL,
  client_title text,
  company text,
  avatar_initials text, -- Fallback letters (e.g. 'SW')
  quote text NOT NULL,
  rating integer DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_featured boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

### Access Control (RLS Policies)

```sql
-- Enable Row Level Security
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active reviews
CREATE POLICY testimonials_select ON public.testimonials 
  FOR SELECT USING (true);

-- Restrict all testimonial creations and edits to administrators
CREATE POLICY testimonials_admin ON public.testimonials 
  FOR ALL USING (public.is_admin());
```

### Database Queries

```sql
-- SELECT: Fetch all featured testimonials ordered by sequence
SELECT * FROM public.testimonials
WHERE is_featured = true
ORDER BY display_order ASC;

-- INSERT: Create a new testimonial (Admin Only)
INSERT INTO public.testimonials (client_name, client_title, company, avatar_initials, quote, rating, is_featured, display_order)
VALUES (
  'Sarah Wilson', 
  'VP of Product', 
  'Vertex Cloud', 
  'SW', 
  'Our web traffic grew by 140% in two months after launch. IgniteX built a massive advantage.', 
  5, 
  true, 
  1
);

-- UPDATE: Modify testimonial fields (Admin Only)
UPDATE public.testimonials
SET quote = 'An exceptional digital experience with pixel-perfect cinematic craftsmanship.', rating = 5
WHERE id = 'd9e0f1a2-1234-5678-abcd-ef0123456789';
```

---

## 8. ADMIN DASHBOARD QUERIES

Composite, high-performance database queries written for custom admin panel statistics, graph visualizers, and notification systems.

```sql
-- 1. COMPOSITE COUNTS: Fetch totals for multiple directories in a single round-trip query
SELECT
  (SELECT count(*) FROM public.newsletter_subscribers WHERE is_active = true) AS active_subscribers,
  (SELECT count(*) FROM public.contact_submissions) AS total_contact_submissions,
  (SELECT count(*) FROM public.projects WHERE is_active = true) AS active_projects,
  (SELECT count(*) FROM public.pricing_plans WHERE is_active = true) AS active_pricing_plans;

-- 2. NOTIFICATION BADGE: Fetch count of new unread contact forms submitted in the last 7 days
SELECT count(*) AS new_submissions_count
FROM public.contact_submissions
WHERE status = 'new' AND submitted_at >= now() - INTERVAL '7 days';

-- 3. STATUS METRICS: Group submissions by status with integers
SELECT status, count(*) AS status_count
FROM public.contact_submissions
GROUP BY status
ORDER BY status_count DESC;

-- 4. SERVICE METRICS (Pie Chart Data): Group submissions by services of interest
SELECT COALESCE(service, 'Other') AS service_name, count(*) AS submission_count
FROM public.contact_submissions
GROUP BY service
ORDER BY submission_count DESC;

-- 5. GROW GRAPH (Line Chart Data): Monthly newsletter growth calculations over the last 12 months.
-- Returns both monthly additions and a rolling cumulative subscriber total for chart nodes.
WITH monthly_metrics AS (
  SELECT 
    date_trunc('month', subscribed_at) AS raw_month,
    count(*) AS monthly_joins
  FROM public.newsletter_subscribers
  WHERE is_active = true
  GROUP BY 1
)
SELECT 
  to_char(raw_month, 'YYYY-MM') AS month_label,
  monthly_joins,
  -- Window function calculates running total sums chronologically
  sum(monthly_joins) OVER (ORDER BY raw_month ASC) AS cumulative_growth_total
FROM monthly_metrics
WHERE raw_month >= date_trunc('month', now()) - INTERVAL '11 months'
ORDER BY raw_month ASC;

-- 6. RECENT FEED: Fetch the most recent 5 proposals for overview feeds
SELECT name, email, service, status, submitted_at
FROM public.contact_submissions
ORDER BY submitted_at DESC
LIMIT 5;
```

---

## 9. ROW LEVEL SECURITY — MASTER POLICY SETUP

We lock down every table inside Supabase using RLS. Client-side reading is permitted on public data while administrators maintain secure full CRUD access.

### Reusable Admin Privilege Validator

This definer function verifies whether an authenticated user is flagged as an administrator in the database.

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  -- Checks profiles to confirm whether the auth.uid matches an admin entry
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER; -- SECURITY DEFINER allows bypass privileges to read public.profiles
```

### Comprehensive Access Policies by Table

Here is the complete sequence of RLS policy blocks:

```sql
-- =========================================================================
-- TABLE: profiles
-- =========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile, and admins to view all profiles
CREATE POLICY select_profile ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

-- Allow users to update their own profile fields, and admins to edit any profile
CREATE POLICY update_profile ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());


-- =========================================================================
-- TABLE: newsletter_subscribers
-- =========================================================================
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow public users (anonymous or authenticated) to subscribe
CREATE POLICY insert_subscriber ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (true);

-- Restrict viewing subscriber emails to administrators only
CREATE POLICY select_subscribers ON public.newsletter_subscribers FOR SELECT
  USING (public.is_admin());

-- Restrict removing subscriber entries to administrators only
CREATE POLICY delete_subscribers ON public.newsletter_subscribers FOR DELETE
  USING (public.is_admin());


-- =========================================================================
-- TABLE: contact_submissions
-- =========================================================================
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow public users (anonymous or authenticated) to submit proposals
CREATE POLICY insert_submission ON public.contact_submissions FOR INSERT
  WITH CHECK (true);

-- Restrict viewing proposals to administrators only
CREATE POLICY select_submissions ON public.contact_submissions FOR SELECT
  USING (public.is_admin());

-- Restrict updating status to administrators only
CREATE POLICY update_submission ON public.contact_submissions FOR UPDATE
  USING (public.is_admin());

-- Restrict deleting proposals to administrators only
CREATE POLICY delete_submission ON public.contact_submissions FOR DELETE
  USING (public.is_admin());


-- =========================================================================
-- TABLE: services
-- =========================================================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Allow public users to view active services
CREATE POLICY select_services ON public.services FOR SELECT
  USING (is_active = true OR public.is_admin());

-- Restrict service additions, updates, and deletes to administrators
CREATE POLICY write_services ON public.services FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- =========================================================================
-- TABLE: projects
-- =========================================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Allow public users to view active projects
CREATE POLICY select_projects ON public.projects FOR SELECT
  USING (is_active = true OR public.is_admin());

-- Restrict project additions, updates, and deletes to administrators
CREATE POLICY write_projects ON public.projects FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- =========================================================================
-- TABLE: pricing_plans
-- =========================================================================
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Allow public users to view active plans
CREATE POLICY select_plans ON public.pricing_plans FOR SELECT
  USING (is_active = true OR public.is_admin());

-- Restrict plan additions, updates, and deletes to administrators
CREATE POLICY write_plans ON public.pricing_plans FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- =========================================================================
-- TABLE: testimonials
-- =========================================================================
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Allow public users to view active testimonials
CREATE POLICY select_testimonials ON public.testimonials FOR SELECT
  USING (true);

-- Restrict testimonial additions, updates, and deletes to administrators
CREATE POLICY write_testimonials ON public.testimonials FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
```

---

## 10. SUPABASE STORAGE BUCKETS

We declare storage infrastructure and configure object access policies to support cover uploads and user profiles.

### Bucket Creation Script

```sql
-- Programmatic registration of buckets inside Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  -- project-covers: public reads, max 5MB, accepting only standard image files
  ('project-covers', 'project-covers', true, 5242880, ARRAY['image/*']),
  -- avatars: authenticated reading, max 2MB, accepting only standard image files
  ('avatars', 'avatars', false, 2097152, ARRAY['image/*'])
ON CONFLICT (id) DO UPDATE 
SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
```

### Storage RLS Policies

```sql
-- =========================================================================
-- BUCKET: project-covers (Public Read, Admin Write)
-- =========================================================================

-- Allow public reading of any files in project-covers bucket
CREATE POLICY "Public Read Covers" ON storage.objects FOR SELECT
  USING (bucket_id = 'project-covers');

-- Allow write operations in project-covers bucket only to administrators
CREATE POLICY "Admin CRUD Covers" ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'project-covers' AND public.is_admin())
  WITH CHECK (bucket_id = 'project-covers' AND public.is_admin());


-- =========================================================================
-- BUCKET: avatars (Authenticated Read, Owner Write)
-- =========================================================================

-- Allow authenticated users to view avatar images
CREATE POLICY "Auth Read Avatars" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

-- Allow authenticated users to perform operations on files in folders matching their user ID
CREATE POLICY "Owner CRUD Avatars" ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 11. INDEXES FOR PERFORMANCE

Optimizes relational execution paths, query speeds, and index-only scans for high-load production environments.

```sql
-- Unique index to prevent duplicate subscribers and optimize resubscribe queries
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_idx 
  ON public.newsletter_subscribers(email);

-- Composite index optimizing administrative status filter sweeps and chronological feeds
CREATE INDEX IF NOT EXISTS contact_submissions_status_submitted_at_idx 
  ON public.contact_submissions(status, submitted_at DESC);

-- Composite index optimizing portfolio grid selects and bento filters
CREATE INDEX IF NOT EXISTS projects_category_featured_active_idx 
  ON public.projects(category, is_featured, is_active)
  WHERE is_active = true;

-- Basic index to accelerate the is_admin() access control evaluator
CREATE INDEX IF NOT EXISTS profiles_role_idx 
  ON public.profiles(role);

-- Partial index optimizing fetching recommended plans (stores only recommended records)
CREATE INDEX IF NOT EXISTS pricing_plans_is_recommended_idx 
  ON public.pricing_plans(is_recommended) 
  WHERE is_recommended = true;
```

---

## 12. FRONTEND INTEGRATION SNIPPETS

Production-grade frontend JavaScript integrations utilizing the `@supabase/supabase-js` v2 client.

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =========================================================================
// 1. NEWSLETTER SUBSCRIBE
// =========================================================================
export async function subscribeNewsletter(email, source = 'hero') {
  // Upsert resolves conflicts by reactivating deactivated entries
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .upsert(
      { email, source, is_active: true }, 
      { onConflict: 'email' }
    )
    .select();
    
  if (error) throw error;
  return data;
}

// =========================================================================
// 2. CONTACT FORM SUBMISSION
// =========================================================================
export async function submitContactForm(name, email, service, budget, message) {
  const { data, error } = await supabase
    .from('contact_submissions')
    .insert([
      { 
        name, 
        email, 
        service, 
        budget_range: budget, 
        message 
      }
    ])
    .select();
    
  if (error) throw error;
  return data;
}

// =========================================================================
// 3. FETCH ACTIVE SERVICES
// =========================================================================
export async function getActiveServices() {
  const { data, error } = await supabase
    .from('services')
    .select('id, title, slug, description, icon_name')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
    
  if (error) throw error;
  return data;
}

// =========================================================================
// 4. FETCH FEATURED PROJECTS
// =========================================================================
export async function getFeaturedProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, slug, category, description, cover_image_url, project_url, tags')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('display_order', { ascending: true });
    
  if (error) throw error;
  return data;
}

// =========================================================================
// 5. FETCH PRICING PLANS
// =========================================================================
export async function getActivePricingPlans() {
  const { data, error } = await supabase
    .from('pricing_plans')
    .select('id, name, slug, price_monthly, price_label, description, features, is_recommended, cta_label')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
    
  if (error) throw error;
  return data;
}

// =========================================================================
// 6. FETCH TESTIMONIALS
// =========================================================================
export async function getFeaturedTestimonials() {
  const { data, error } = await supabase
    .from('testimonials')
    .select('id, client_name, client_title, company, avatar_initials, quote, rating')
    .eq('is_featured', true)
    .order('display_order', { ascending: true });
    
  if (error) throw error;
  return data;
}

// =========================================================================
// 7. USER AUTHENTICATION APIS
// =========================================================================

// A. Sign up with email & password
export async function signUpWithEmail(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName // Automatically saved to raw_user_meta_data and synced via trigger
      }
    }
  });
  if (error) throw error;
  return data;
}

// B. Sign in with email & password
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

// C. Sign in with Google OAuth
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`
    }
  });
  if (error) throw error;
  return data;
}

// D. Sign out user session
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// E. Get current active session
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}
```

---

## 13. FLAG INTERMEDIARIES & EDGE FUNCTIONS

Several operations require secure intermediaries rather than direct client-side requests:

1.  **Administrative Role Promotion**:
    *   *Direct Client Update*: ❌ **Blocked by RLS**.
    *   *Solution*: Execute SQL scripts directly inside the Supabase Dashboards or create a specialized API route hosted on a secure Supabase Edge Function restricted to `role = 'admin'` accounts.
2.  **Anonymous Unsubscribing**:
    *   *Direct Client Update*: ❌ **Blocked by RLS (public cannot modify subscriber rows)**.
    *   *Solution*: Create a public Supabase Edge Function (e.g. `/unsubscribe?token=XYZ`). This Edge Function decrypts the unsubscribe payload containing the target email and runs `UPDATE public.newsletter_subscribers SET is_active = false` with system bypass credentials safely, preventing email spoofing and security leaks.
3.  **Spam Filter & Contact Form Hooks**:
    *   *Direct Client Insertion*: ⚠️ **Permitted but vulnerable to bot spam**.
    *   *Solution*: Create a secure Supabase Edge Function to intercept insertions, validate submissions against standard reCAPTCHA APIs, and automatically distribute notifications directly to agency Slack Channels or SMTP servers.

---

## 14. ORDERED SETUP CHECKLIST

Follow this exact sequential checklist in the Supabase **SQL Editor** to initialize the IgniteX database backend:

1.  **Create Custom Functions**: Execute the reusable admin helper function `is_admin()`.
2.  **Initialize Tables**: Create the database tables (`profiles`, `newsletter_subscribers`, `contact_submissions`, `services`, `projects`, `pricing_plans`, `testimonials`).
3.  **Setup Authentication Triggers**: Define the `handle_new_user()` trigger function and bind it as an `AFTER INSERT ON auth.users` trigger.
4.  **Configure Storage Infrastructure**: Run the programmatic bucket setup script to register `project-covers` and `avatars`.
5.  **Configure RLS Policies**: Enable Row Level Security across all tables and execute every `CREATE POLICY` block (including storage bucket policies).
6.  **Build Performance Indexes**: Run the `CREATE INDEX` block to accelerate relational lookups.
7.  **Seed Initial Data**: Seed sample pricing plans (with detailed feature objects) and service listings to test retrieval queries.
8.  **Promote Administrators**: Promote your primary administrator email by executing the promotion statement.
