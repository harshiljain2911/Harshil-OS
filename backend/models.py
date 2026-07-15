"""
Content schema — SINGLE SOURCE OF TRUTH.

Pydantic v2 models here are the canonical schema. They are exported to
JSON Schema (see /api/schemas endpoint) and consumed by:
  - backend content loader (boot-time validation)
  - frontend Zod validators (pre-commit + optional runtime)

Never hand-author the equivalent TS/Zod file. Regenerate it from the
JSON Schema exposed at /api/schemas or via `python schemas_export.py`.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class Base(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class Media(Base):
    url: str
    alt: str = ""
    caption: str | None = None
    kind: Literal["image", "video"] = "image"


class Link(Base):
    label: str
    url: str


class DomainStatus(str, Enum):
    active = "active"
    exploring = "exploring"
    dormant = "dormant"


class DomainSubtopic(Base):
    """A named area inside a domain (e.g. 'Frontend' inside Software Engineering).

    Subtopics are NOT separate top-level domains and never get their own route —
    they're structured detail rendered within the parent domain's page.
    """
    slug: str
    name: str
    summary: str | None = None


class DomainLearningMilestone(Base):
    date: str
    title: str
    summary: str | None = None


class DomainRoadmapItem(Base):
    title: str
    status: Literal["planned", "in-progress"] = "planned"
    note: str | None = None


class Domain(Base):
    # Core identity
    slug: str
    name: str
    tagline: str
    overview: str
    philosophy: str | None = None
    status: DomainStatus = DomainStatus.active

    # Practice
    skills: list[str] = Field(default_factory=list)         # conceptual/practical ability, e.g. "PCB Layout", "API Design"
    technologies: list[str] = Field(default_factory=list)   # concrete tools/platforms, quick-reference (card badges etc.)
    focus_areas: list[str] = Field(default_factory=list)
    subtopics: list[DomainSubtopic] = Field(default_factory=list)

    # Long-term evidence — no numeric "%" or scores, structured narrative only
    learning_journey: list[DomainLearningMilestone] = Field(default_factory=list)
    future_roadmap: list[DomainRoadmapItem] = Field(default_factory=list)
    highlight_project_slugs: list[str] = Field(default_factory=list)

    # Presentation / long-term metadata
    icon: str | None = None
    cover_image: Media | None = None
    theme_color: str | None = None
    gallery: list[Media] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    libraries: list[str] = Field(default_factory=list)
    hardware: list[str] = Field(default_factory=list)
    software: list[str] = Field(default_factory=list)
    external_links: list[Link] = Field(default_factory=list)
    featured_quote: str | None = None
    key_takeaways: list[str] = Field(default_factory=list)
    metrics: list[str] = Field(default_factory=list)
    resume_url: str | None = None  # domain-specific resume PDF (upload via Media Library)

    # NOTE: no `featured` / `order` — ranking is computed from linked content,
    # see `domain_depth_score()` in content_loader.py. Never manually assigned,
    # never exposed in the API response, used only as an internal sort key.
    updated_at: str


class ProjectSection(Base):
    heading: str
    body_md: str | None = None
    applicable: bool = True


class Project(Base):
    slug: str
    title: str
    subtitle: str
    domain_slugs: list[str]
    year: int
    status: Literal["shipped", "in-progress", "archived", "prototype"] = "shipped"
    difficulty: Literal["", "beginner", "intermediate", "advanced"] = ""
    version: str | None = None
    role: str
    stack: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    summary: str
    problem: str
    approach: str
    outcome: str
    metrics: list[str] = Field(default_factory=list)
    learnings: str
    next_steps: str | None = None
    # Rich technical detail (rendered in Developer mode / project page)
    architecture: str | None = None
    engineering_notes: str | None = None
    skills_learned: list[str] = Field(default_factory=list)
    related_cert_slugs: list[str] = Field(default_factory=list)
    # Media — uploaded via the CMS media picker, never manual URLs.
    links: list[Link] = Field(default_factory=list)
    hero_media: Media | None = None
    media: list[Media] = Field(default_factory=list)      # gallery: images + videos
    demo_video_url: str | None = None                     # single featured demo video
    github_url: str | None = None
    live_url: str | None = None
    featured: bool = False
    updated_at: str


class Certification(Base):
    slug: str
    title: str
    issuer: str
    issued_at: str
    credential_url: str | None = None
    credential_id: str | None = None
    image_url: str | None = None  # certificate preview (upload via Media Library)
    skills: list[str] = Field(default_factory=list)
    domain_slugs: list[str] = Field(default_factory=list)


class ExperienceEntry(Base):
    slug: str
    role: str
    org: str
    start: str
    end: str | None = None
    location: str | None = None
    summary: str
    highlights: list[str] = Field(default_factory=list)
    stack: list[str] = Field(default_factory=list)
    domain_slugs: list[str] = Field(default_factory=list)


# Resume "type" doubles as the domain association — values match domain slugs so
# each domain page can auto-resolve its resume. "general" shows on the main
# Resume page; "custom" is unassociated.
ResumeType = Literal[
    "general", "artificial-intelligence", "software-engineering",
    "embedded-systems", "electronics-engineering", "robotics-iot",
    "ui-ux-design", "custom",
]


class Resume(Base):
    slug: str
    title: str
    resume_type: ResumeType = "general"
    description: str | None = None
    pdf_url: str | None = None        # uploaded PDF (CMS media picker → uploads/resumes/)
    thumbnail_url: str | None = None  # optional preview image
    version: str | None = None
    featured: bool = False            # only one may be featured (enforced on write)
    updated_at: str


class Achievement(Base):
    slug: str
    title: str
    date: str
    category: Literal["award", "publication", "talk", "milestone", "recognition"]
    summary: str
    url: str | None = None
    domain_slugs: list[str] = Field(default_factory=list)


class TimelineEvent(Base):
    slug: str
    date: str
    title: str
    category: Literal["project", "role", "achievement", "learning", "life"]
    summary: str
    ref_slug: str | None = None


class BlogPost(Base):
    slug: str
    title: str
    subtitle: str | None = None
    published_at: str
    tags: list[str] = Field(default_factory=list)
    reading_minutes: int
    body_md: str
    related_slugs: list[str] = Field(default_factory=list)
    domain_slugs: list[str] = Field(default_factory=list)


class ResearchNote(Base):
    slug: str
    title: str
    variant: Literal["experiment", "reading", "hypothesis", "reflection"]
    started_at: str
    status: Literal["open", "closed", "stalled"] = "open"
    summary: str
    body_md: str
    references: list[Link] = Field(default_factory=list)
    domain_slugs: list[str] = Field(default_factory=list)


# ---- Site singleton — identity, hero, about, contact, social, SEO, nav, etc. ----
# Unlike the collections above (one JSON file per item, loaded as a list), this is
# ONE JSON file (content/site.json) describing the site-wide, non-collection content
# that used to be hand-typed across Navbar/Footer/Home/About/Contact/Resume/etc.

class SiteIdentity(Base):
    """Who you are — deliberately not shaped around one job title.

    Two kinds of fields live here:
      - Core facts: name, brand, institution, status — short and structural.
      - Portable one-liners: positioning_statement, professional_headline,
        recruiter_summary, developer_summary — short enough to reuse anywhere
        (nav, meta tags, terminal `whoami`, resume header, OG cards) without
        pulling in a whole page's worth of copy.

    The longer-form content that these one-liners are a compressed version of
    still lives where it always did — `narrative` (positioning paragraph,
    professional summary, philosophy, values, bios), `recruiter.pitch` (full
    Recruiter Mode page copy), `developer.mode_summary` (full Developer Mode
    page copy). Nothing here duplicates those; each field below is scoped to
    "quick reference," not "the whole story."
    """

    # Core facts
    full_name: str
    display_name: str
    brand_name: str | None = None  # composed brand string, e.g. "Harshil/OS" — single source instead of recomputing display_name+brand_suffix everywhere
    brand_suffix: str = "OS"
    brand_slug: str
    tagline: str
    one_liner: str | None = None

    # Positioning — intentionally not a single job title
    positioning_statement: str | None = None  # 1-2 sentences, "how I introduce myself" — portable version of narrative.positioning
    professional_headline: str | None = None  # e.g. "Multidisciplinary Engineer — Hardware, Software, AI"
    current_status: str | None = None  # e.g. "B.Tech Student"
    institution: str | None = None  # e.g. "The LNM Institute of Information Technology (LNMIIT), Jaipur"
    education_summary: str | None = None  # one line, e.g. "B.Tech, Electronics & Communication Engineering — 5th Semester"
    primary_focus_areas: list[str] = Field(default_factory=list)  # top-line tags, e.g. ["Embedded Systems", "Full-Stack Development", "Applied AI"]
    current_interests: list[str] = Field(default_factory=list)  # what's actively being explored, distinct from established focus areas
    recruiter_summary: str | None = None  # short, portable — distinct from recruiter.pitch (the full Recruiter Mode page copy)
    developer_summary: str | None = None  # short, portable — distinct from developer.mode_summary (the full Developer Mode page copy)

    # Deprecated — kept only so existing consumers (StructuredData.jsx jobTitle)
    # keep working without a code change. Prefer `professional_headline` /
    # `primary_focus_areas` for anything new.
    role_title: str | None = None
    role_subtitle: str | None = None


class SiteHero(Base):
    badge: str
    headline_line2: str
    headline_line3: str
    subhead: str
    cta_primary_label: str
    cta_secondary_label: str
    cta_tertiary_label: str
    stat_focus_value: str
    stat_modes_value: str


class SiteFact(Base):
    label: str
    value: str


class SiteAbout(Base):
    eyebrow: str
    title: str
    subtitle: str
    bio_paragraphs: list[str] = Field(default_factory=list)
    facts: list[SiteFact] = Field(default_factory=list)


class SiteEducationEntry(Base):
    school: str
    degree: str
    field: str | None = None
    start: str
    end: str | None = None
    location: str | None = None
    summary: str | None = None
    cgpa: str | None = None
    coursework: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    related_project_slugs: list[str] = Field(default_factory=list)


class SiteContact(Base):
    email: str
    phone: str | None = None
    location: str = "Remote-first"
    page_eyebrow: str
    page_title: str
    page_subtitle: str


class SiteSocial(Base):
    github: str | None = None
    linkedin: str | None = None
    twitter: str | None = None
    email: str | None = None
    leetcode: str | None = None
    codeforces: str | None = None
    hackerrank: str | None = None


class SiteResumeFile(Base):
    label: str  # e.g. "Software Engineering Resume"
    url: str    # e.g. "/uploads/resume-swe-ab12cd34.pdf" (from the media library)


class SiteResume(Base):
    file_url: str | None = None  # legacy single-file field, kept for back-compat
    files: list[SiteResumeFile] = Field(default_factory=list)  # multiple targeted resumes
    download_mode: Literal["file", "print"] = "print"
    role_line: str


class SiteSEO(Base):
    default_title_suffix: str
    default_description: str
    keywords: list[str] = Field(default_factory=list)
    site_url: str | None = None
    og_image_default: str | None = None


class SiteFooter(Base):
    tagline: str
    copyright_name: str


class SiteFavicon(Base):
    url: str | None = None


class SiteProfileImage(Base):
    url: str | None = None
    alt: str | None = None


class SiteNavLink(Base):
    label: str
    to: str


class SiteFooterColumn(Base):
    title: str
    links: list[SiteNavLink] = Field(default_factory=list)


class SiteNav(Base):
    primary: list[SiteNavLink] = Field(default_factory=list)
    recruiter: list[SiteNavLink] = Field(default_factory=list)
    footer_columns: list[SiteFooterColumn] = Field(default_factory=list)


class SiteRecruiter(Base):
    eyebrow: str
    title: str
    subtitle: str
    next_step_eyebrow: str
    next_step_title: str
    pitch: str | None = None  # longer-form recruiter pitch; not yet rendered anywhere


class SiteDeveloper(Base):
    mode_summary: str | None = None  # not yet rendered anywhere — Developer.jsx subtitle is still hardcoded


class SiteAI(Base):
    """Admin-editable assistant configuration (AI Settings page). API keys are
    NEVER stored here — only the provider choice and model id. Keys stay in the
    backend environment. `provider` empty = auto-detect (OpenRouter preferred)."""
    provider: str | None = None  # openrouter | anthropic | openai | gemini ("" / None = auto + fallback)
    model: str | None = None     # legacy single override (applies to the pinned provider)
    models: dict[str, str] = Field(default_factory=dict)  # per-provider model overrides


class SiteCoreValue(Base):
    label: str
    evidence: str


class SitePhilosophy(Base):
    title: str
    body: str


# Brand-voice content (positioning, bios, values, philosophy) that doesn't yet
# have a dedicated UI surface. Stored here so it's centralized and ready to wire
# in as the corresponding pages/sections are built out.
class SiteNarrative(Base):
    positioning: str
    professional_summary: str
    career_mission: str
    philosophy: SitePhilosophy
    core_values: list[SiteCoreValue] = Field(default_factory=list)
    differentiators: list[str] = Field(default_factory=list)
    short_bio: str
    long_bio: list[str] = Field(default_factory=list)


class Site(Base):
    identity: SiteIdentity
    hero: SiteHero
    about: SiteAbout
    narrative: SiteNarrative
    education: list[SiteEducationEntry] = Field(default_factory=list)
    contact: SiteContact
    social: SiteSocial
    resume: SiteResume
    seo: SiteSEO
    footer: SiteFooter
    favicon: SiteFavicon = Field(default_factory=SiteFavicon)
    profile_image: SiteProfileImage = Field(default_factory=SiteProfileImage)
    nav: SiteNav
    recruiter: SiteRecruiter
    developer: SiteDeveloper = Field(default_factory=SiteDeveloper)
    ai: SiteAI = Field(default_factory=SiteAI)


# ---- Non-content models (form submissions live in Mongo, not content/) ----

class ContactSubmission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    email: str
    subject: str
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ContactSubmissionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=200, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=4000)
    # Honeypot — bots fill hidden fields; humans leave it empty.
    company: str = Field(default="", max_length=200)


class AssistantRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=120)
    question: str = Field(min_length=1, max_length=2000)


class AssistantCitation(BaseModel):
    kind: str
    slug: str
    title: str


class AssistantResponse(BaseModel):
    answer: str
    citations: list[AssistantCitation]
    session_id: str


COLLECTION_MAP: dict[str, type[BaseModel]] = {
    "domains": Domain,
    "projects": Project,
    "certifications": Certification,
    "experience": ExperienceEntry,
    "achievements": Achievement,
    "timeline": TimelineEvent,
    "blog": BlogPost,
    "research": ResearchNote,
    "resumes": Resume,
}
