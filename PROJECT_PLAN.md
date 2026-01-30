# Inkwell Project Plan

> AI-powered tool that transforms YouTube video libraries into professionally structured, print-ready books.

## Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Backend:** Convex (serverless functions, real-time sync)
- **Database:** Convex (document-based)
- **Authentication:** Clerk
- **Payments:** Polar.sh
- **AI:** Claude API
- **Image Generation:** Nano Banana Pro
- **PDF Generation:** TBD (Puppeteer or WeasyPrint)

## Design System

- **Heading Font:** IBM Plex Serif
- **Body Font:** Helvetica
- **Style:** Clean, premium feel with rounded corners and soft shadows
- **Theme:** Light mode color palette

---

## Phase 1: Foundation

### 1.1 Project Setup

- [ ] Initialize Next.js project with App Router
- [ ] Configure TypeScript
- [ ] Install and configure Tailwind CSS
- [ ] Set up IBM Plex Serif font (Google Fonts) and Helvetica
- [ ] Create base design tokens (colors, spacing, shadows, border-radius)
- [ ] Set up project folder structure (`/app`, `/components`, `/lib`, `/convex`)
- [ ] Configure ESLint and Prettier
- [ ] Create base layout component with consistent styling
- [ ] Build reusable UI components (Button, Card, Input, Modal) with premium styling

### 1.2 Convex Backend Setup

- [ ] Install Convex and initialize project
- [ ] Configure Convex environment variables
- [ ] Design and create database schema:
  - [ ] `users` table (linked to Clerk)
  - [ ] `projects` table (book projects)
  - [ ] `videos` table (YouTube videos with transcripts)
  - [ ] `voiceProfiles` table
  - [ ] `bookConcepts` table
  - [ ] `chapters` table
  - [ ] `chapterDrafts` table (with version history)
  - [ ] `covers` table
  - [ ] `purchases` table
- [ ] Set up Convex functions structure (queries, mutations, actions)
- [ ] Implement basic CRUD operations for projects

### 1.3 Clerk Authentication

- [ ] Create Clerk application and configure settings
- [ ] Install Clerk SDK for Next.js
- [ ] Set up Clerk environment variables
- [ ] Implement ClerkProvider in app layout
- [ ] Create sign-in page with premium styling
- [ ] Create sign-up page with premium styling
- [ ] Set up protected routes middleware
- [ ] Implement user sync between Clerk and Convex
- [ ] Add user profile dropdown in header

### 1.4 YouTube OAuth Integration

- [ ] Set up Google Cloud project for YouTube API
- [ ] Configure OAuth 2.0 credentials
- [ ] Implement YouTube OAuth flow (separate from Clerk auth)
- [ ] Store YouTube tokens securely in Convex
- [ ] Handle token refresh logic
- [ ] Create "Connect YouTube" UI component

### 1.5 YouTube Data Integration

- [ ] Implement YouTube Data API client
- [ ] Create function to fetch channel videos list
- [ ] Build video selection UI with:
  - [ ] Video list display (title, date, duration, thumbnail)
  - [ ] Select/deselect individual videos
  - [ ] Select all functionality
  - [ ] Date range filter
  - [ ] Search by title filter
- [ ] Implement transcript fetching via YouTube API
- [ ] Handle videos without transcripts (error messaging)
- [ ] Store transcripts in Convex
- [ ] Create transcript viewer component

### 1.6 Project Creation Flow

- [ ] Build "New Project" page
- [ ] Create project naming and description form
- [ ] Implement video selection step
- [ ] Build progress indicator for transcript pulling
- [ ] Create project dashboard showing selected videos and transcripts
- [ ] Add project list view on home page

**Phase 1 Completion Criteria:**
- [ ] User can sign in via Clerk
- [ ] User can connect YouTube account via OAuth
- [ ] User can select videos from their channel
- [ ] User can view pulled transcripts stored in Convex

---

## Phase 2: Content Analysis

### 2.1 AI Analysis Pipeline

- [ ] Set up Claude API client
- [ ] Configure API key management via environment variables
- [ ] Create Convex action for AI processing (handles longer execution)
- [ ] Implement transcript chunking for large content
- [ ] Build retry logic and error handling for API calls

### 2.2 Voice Profile Extraction

- [ ] Design voice profile data structure:
  - [ ] Formality level
  - [ ] Teaching style
  - [ ] Vocabulary patterns
  - [ ] Common phrases
  - [ ] Personality traits
- [ ] Create Claude prompt for voice extraction
- [ ] Implement voice profile generation function
- [ ] Build voice profile review UI
- [ ] Add voice profile editing capabilities
- [ ] Implement regeneration with user guidance
- [ ] Save voice profile to Convex

### 2.3 Book Concept Generation

- [ ] Create Claude prompt for book concept generation
- [ ] Implement function to generate 3-5 book concepts
- [ ] Each concept includes:
  - [ ] Title
  - [ ] Subtitle
  - [ ] 2-3 sentence blurb
  - [ ] Primary themes covered
- [ ] Build concept selection UI (card-based layout)
- [ ] Implement "request more concepts" functionality
- [ ] Add concept editing/customization feature
- [ ] Save selected concept to Convex

### 2.4 Analysis UI/UX

- [ ] Create analysis progress page with status indicators
- [ ] Build voice profile display component
- [ ] Create book concept cards with premium styling
- [ ] Add smooth transitions between analysis steps
- [ ] Implement loading states and skeleton screens

**Phase 2 Completion Criteria:**
- [ ] User can generate and view voice profile
- [ ] User can edit/regenerate voice profile
- [ ] User can view 3-5 AI-generated book concepts
- [ ] User can select and customize a book concept

---

## Phase 3: Chapter Workflow

### 3.1 Chapter Structure Proposal

- [ ] Create Claude prompt for chapter structure generation
- [ ] Implement function to propose 5-8 chapters based on concept
- [ ] Each chapter includes:
  - [ ] Title
  - [ ] Description
  - [ ] Estimated length
  - [ ] Source videos mapped to it
- [ ] Store chapter structure in Convex

### 3.2 Chapter Editor UI

- [ ] Build chapter list view with drag-and-drop (using dnd-kit or similar)
- [ ] Implement chapter reordering functionality
- [ ] Create chapter rename/edit description modal
- [ ] Build chapter merge functionality:
  - [ ] Select two adjacent chapters
  - [ ] Combine into single chapter
- [ ] Build chapter split functionality:
  - [ ] Select split point or let AI suggest
  - [ ] Create two chapters from one
- [ ] Implement "Add new chapter" with custom topic
- [ ] Add chapter removal with confirmation
- [ ] Create "Regenerate structure" with feedback option

### 3.3 Source Video Mapping

- [ ] Display which videos map to which chapters
- [ ] Allow manual reassignment of videos to chapters
- [ ] Show transcript excerpts relevant to each chapter
- [ ] Highlight unmapped videos (if any)

### 3.4 Chapter Draft Generation

- [ ] Create Claude prompt for chapter writing
- [ ] Implement single chapter draft generation
- [ ] Implement batch generation (all chapters)
- [ ] Apply voice profile to generated content
- [ ] Transform spoken style to written style
- [ ] Add appropriate transitions and structure
- [ ] Build progress indicator for generation
- [ ] Implement auto-save of drafts
- [ ] Store drafts with version history in Convex

### 3.5 Chapter Workflow UI

- [ ] Create chapter overview page
- [ ] Build chapter structure editor with premium styling
- [ ] Add visual indicators for draft status (not started, in progress, complete)
- [ ] Create chapter preview cards
- [ ] Implement smooth animations for drag-and-drop

**Phase 3 Completion Criteria:**
- [ ] User can view and modify proposed chapter structure
- [ ] User can reorder, rename, merge, split chapters
- [ ] User can add or remove chapters
- [ ] User can generate AI drafts for all chapters
- [ ] Drafts are saved and accessible

---

## Phase 4: Editing & Refinement

### 4.1 Rich Text Editor

- [ ] Evaluate and select rich text editor (Tiptap, Slate, or similar)
- [ ] Integrate editor into chapter edit page
- [ ] Configure editor for book-appropriate formatting:
  - [ ] Headings (H1, H2, H3)
  - [ ] Paragraphs
  - [ ] Bold, italic, underline
  - [ ] Block quotes
  - [ ] Lists (ordered and unordered)
- [ ] Style editor to match premium design system
- [ ] Implement auto-save functionality
- [ ] Add word count display

### 4.2 AI-Assisted Editing

- [ ] Implement text selection detection
- [ ] Create floating toolbar for selected text
- [ ] Build AI editing actions:
  - [ ] Rewrite selected text
  - [ ] Expand selected text
  - [ ] Condense selected text
  - [ ] Make more conversational
  - [ ] Make more formal
- [ ] Create Claude prompts for each editing action
- [ ] Show AI suggestions inline with accept/reject
- [ ] Implement "Continue writing" from cursor position
- [ ] Add loading states for AI operations

### 4.3 Comments & Notes

- [ ] Implement inline comment/note system
- [ ] Allow users to add notes to specific sections
- [ ] Create notes sidebar or panel
- [ ] Style notes to be visually distinct from content

### 4.4 Version History

- [ ] Store chapter versions on significant changes
- [ ] Build version history panel
- [ ] Allow viewing previous versions
- [ ] Implement revert to previous version
- [ ] Show diff between versions (optional enhancement)

### 4.5 Editor UI Polish

- [ ] Create chapter navigation sidebar
- [ ] Build distraction-free writing mode
- [ ] Add keyboard shortcuts for common actions
- [ ] Implement smooth transitions between chapters
- [ ] Add progress tracking across all chapters

**Phase 4 Completion Criteria:**
- [ ] User can edit chapter content in rich text editor
- [ ] User can select text and apply AI editing actions
- [ ] User can add inline notes
- [ ] User can view and revert to previous versions
- [ ] All changes auto-save

---

## Phase 5: Cover & Export

### 5.1 Cover Upload

- [ ] Create cover upload component
- [ ] Accept JPG/PNG formats
- [ ] Validate image dimensions (minimum 300 DPI for KDP)
- [ ] Implement image preview
- [ ] Store cover in Convex file storage
- [ ] Show dimension/quality warnings if needed

### 5.2 AI Cover Generation

- [ ] Set up Nano Banana Pro API integration
- [ ] Create cover generation form:
  - [ ] Title input
  - [ ] Subtitle input
  - [ ] Style preferences selector
  - [ ] Color scheme options
- [ ] Implement cover generation function
- [ ] Generate 3-4 cover options
- [ ] Build cover selection gallery
- [ ] Add "Regenerate with different parameters" option
- [ ] Validate generated covers meet KDP requirements

### 5.3 Cover Preview

- [ ] Create realistic book cover preview component
- [ ] Show cover as it will appear on final PDF
- [ ] Display front cover mockup
- [ ] Add spine preview (optional enhancement)

### 5.4 PDF Generation Setup

- [ ] Evaluate PDF generation options (Puppeteer vs WeasyPrint)
- [ ] Set up serverless function for PDF generation
- [ ] Create PDF template with:
  - [ ] Proper margins for printing
  - [ ] Gutter space for binding
  - [ ] Page numbers
  - [ ] Chapter headings in header/footer
- [ ] Implement font embedding

### 5.5 Front Matter Generation

- [ ] Create title page template
- [ ] Create copyright page template
- [ ] Generate table of contents from chapters
- [ ] Style front matter to match book design

### 5.6 PDF Export Options

- [ ] Implement trim size selection:
  - [ ] 6x9" (default)
  - [ ] 5.5x8.5"
- [ ] Create KDP-compliant PDF export
- [ ] Create standard PDF export (digital distribution)
- [ ] Build PDF preview functionality
- [ ] Validate PDF against KDP specifications
- [ ] Implement PDF download functionality

### 5.7 Export UI

- [ ] Create export settings page
- [ ] Build trim size selector with visual preview
- [ ] Add PDF generation progress indicator
- [ ] Create download button with format options
- [ ] Show KDP compliance checklist

**Phase 5 Completion Criteria:**
- [ ] User can upload custom cover
- [ ] User can generate AI covers and select one
- [ ] User can preview cover on book
- [ ] User can select trim size
- [ ] User can generate and preview PDF
- [ ] PDF meets Amazon KDP specifications
- [ ] User can download print-ready and standard PDFs

---

## Phase 6: Payments & Polish

### 6.1 Polar.sh Integration

- [ ] Create Polar.sh account and configure product
- [ ] Set up Polar.sh SDK/API client
- [ ] Configure environment variables
- [ ] Create product for book export ($149)
- [ ] Implement checkout session creation

### 6.2 Purchase Flow

- [ ] Design paywall placement (at PDF download)
- [ ] Create pricing display component
- [ ] Build checkout redirect flow
- [ ] Implement Polar.sh webhook handling:
  - [ ] Payment success webhook
  - [ ] Store purchase record in Convex
- [ ] Handle payment confirmation
- [ ] Unlock PDF download after payment
- [ ] Send email receipt (via Polar.sh)

### 6.3 Download Management

- [ ] Create purchases list in user account
- [ ] Allow re-download of purchased books
- [ ] Track download history
- [ ] Implement secure download links

### 6.4 New Project After Completion

- [ ] Enable starting new book project
- [ ] Show completed projects in dashboard
- [ ] Separate active and completed projects

### 6.5 Error Handling & Edge Cases

- [ ] Implement global error boundary
- [ ] Add error toasts/notifications
- [ ] Handle API failures gracefully
- [ ] Add retry mechanisms for transient errors
- [ ] Create helpful error messages for common issues:
  - [ ] YouTube API quota exceeded
  - [ ] Video without transcript
  - [ ] AI generation failures
  - [ ] Payment failures

### 6.6 UI Polish

- [ ] Review and refine all page layouts
- [ ] Ensure consistent spacing and typography
- [ ] Add micro-interactions and animations
- [ ] Optimize loading states throughout app
- [ ] Add empty states for lists
- [ ] Implement responsive design for tablet/mobile
- [ ] Add subtle hover effects on interactive elements
- [ ] Review and polish soft shadows and rounded corners

### 6.7 Performance Optimization

- [ ] Implement code splitting
- [ ] Optimize images and assets
- [ ] Add caching where appropriate
- [ ] Review Convex query efficiency
- [ ] Lazy load heavy components

### 6.8 Testing & QA

- [ ] Test complete user flow end-to-end
- [ ] Verify KDP PDF compliance with actual upload
- [ ] Test payment flow with test mode
- [ ] Cross-browser testing
- [ ] Mobile responsiveness testing
- [ ] Error scenario testing

### 6.9 Documentation & Deployment

- [ ] Set up production environment variables
- [ ] Configure production Convex deployment
- [ ] Deploy to Vercel (or preferred host)
- [ ] Set up production Clerk environment
- [ ] Configure production Polar.sh webhooks
- [ ] Create user-facing help/FAQ content
- [ ] Document API keys and service configurations

**Phase 6 Completion Criteria:**
- [ ] User can pay $149 via Polar.sh
- [ ] User receives email receipt
- [ ] User can download PDF after payment
- [ ] User can re-download anytime
- [ ] User can start new projects
- [ ] App is polished and production-ready
- [ ] Founder has successfully created own book using the tool

---

## Summary Checklist

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Foundation (Setup, Auth, YouTube) | Not Started |
| Phase 2 | Content Analysis (Voice, Concepts) | Not Started |
| Phase 3 | Chapter Workflow (Structure, Drafts) | Not Started |
| Phase 4 | Editing & Refinement (Editor, AI Help) | Not Started |
| Phase 5 | Cover & Export (PDF Generation) | Not Started |
| Phase 6 | Payments & Polish (Polar, QA) | Not Started |

---

## Notes

- YouTube OAuth is separate from Clerk authentication
- Convex functions have a 10s default timeout (60s for actions) - plan for chunking large operations
- Voice profile should be editable throughout the project
- All user content stored securely in Convex with proper access controls
- KDP specifications are strict - test early with actual uploads
