from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Frame, Paragraph


ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_PATH = OUTPUT_DIR / "dynalink-connect-app-summary.pdf"


TITLE = "DynaLink Connect"
SUBTITLE = "One-page repo-based application summary"

LEFT_SECTIONS = [
    (
        "What It Is",
        [
            "A multi-vendor e-commerce marketplace built with Next.js, Prisma, NextAuth, and Paynow.",
            "It combines customer shopping, vendor storefront management, admin operations, delivery coordination, and WhatsApp-assisted commerce in one codebase.",
        ],
    ),
    (
        "Who It's For",
        [
            "Primary persona: customers ordering from nearby/local vendors through one shared marketplace.",
            "Also includes dedicated vendor, admin, and courier workflows in the repo.",
        ],
    ),
    (
        "What It Does",
        [
            "Lists storefronts and products with search, categories, trending/top-rated views, and nearby-store ranking.",
            "Handles signup/signin with NextAuth credentials plus OTP delivery over email, SMS, or WhatsApp.",
            "Supports cart, checkout, delivery quotes, pickup, scheduled delivery, and wallet or Paynow payments.",
            "Gives vendors product CRUD, CSV bulk import, delivery zones, payout visibility, and order management.",
            "Provides admin dashboards for customers, vendors, orders, couriers, payments, settings, marketing, and sales export.",
            "Runs a WhatsApp commerce bot for search, cart building, checkout, payment follow-up, and order status commands.",
        ],
    ),
    (
        "How To Run",
        [
            "1. `npm install`",
            "2. Copy `.env.example` to `.env` and set required values at minimum: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `PAYNOW_*`.",
            "3. Initialize Prisma: `npx prisma migrate dev --name init` then `npx prisma generate`.",
            "4. Start dev server: `npm run dev` and open `http://localhost:3001`.",
            "Optional seed flow: `POST /api/seed` is documented in `README.md`, but local seed setup is not fully defined there.",
        ],
    ),
]

RIGHT_SECTIONS = [
    (
        "How It Works",
        [
            "Frontend: Next.js App Router pages under `app/` with reusable UI in `components/`; the home page assembles hero, categories, and ranked store grids.",
            "Auth: `lib/auth.ts` configures NextAuth credential login and stores session role/id in JWT-backed sessions.",
            "API layer: Route handlers under `app/api/` cover checkout, vendor/admin operations, analytics, site settings, auth, wallet, and the WhatsApp webhook.",
            "Data: Prisma models store users, vendors, products, orders, order items, payouts, delivery zones, notifications, wallet activity, site settings, and WhatsApp conversations/messages.",
            "Payments: checkout creates orders, computes platform/vendor amounts, then starts Paynow transactions in `lib/paynow.ts`; wallet purchases are also supported.",
            "Delivery: `lib/delivery.ts` groups cart items by vendor and calculates fees; `lib/google-maps.ts` calls Google Maps for route-based delivery lookup when configured.",
            "Infra/storage note: local Prisma uses SQLite in `prisma/schema.prisma`; README states MySQL is used for production deployment. A separate queue/worker service is Not found in repo.",
        ],
    ),
]


def build_styles():
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#0f172a"),
            alignment=TA_LEFT,
            spaceAfter=4,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=11,
            textColor=colors.HexColor("#475569"),
            alignment=TA_LEFT,
            spaceAfter=10,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=13,
            textColor=colors.HexColor("#111827"),
            spaceBefore=2,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.3,
            leading=10.2,
            textColor=colors.HexColor("#1f2937"),
            leftIndent=0,
            spaceAfter=3,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.2,
            leading=9.8,
            textColor=colors.HexColor("#1f2937"),
            leftIndent=10,
            firstLineIndent=-7,
            bulletIndent=0,
            spaceAfter=2,
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=styles["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=7.4,
            leading=9,
            textColor=colors.HexColor("#64748b"),
        ),
    }


def add_section(flow, title, items, styles):
    flow.append(Paragraph(title, styles["section"]))
    first = True
    for item in items:
        style = styles["body"] if first and len(item) < 220 and not item.startswith("1.") else styles["bullet"]
        if style is styles["bullet"]:
            flow.append(Paragraph(item, style, bulletText="-"))
        else:
            flow.append(Paragraph(item, style))
        first = False


def build_story(sections, styles):
    story = []
    for title, items in sections:
        add_section(story, title, items, styles)
    return story


def generate_pdf():
    from reportlab.pdfgen import canvas

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    page_width, page_height = letter
    margin = 0.52 * inch
    gutter = 0.24 * inch
    header_height = 0.92 * inch
    footer_height = 0.34 * inch
    column_width = (page_width - (2 * margin) - gutter) / 2
    content_top = page_height - margin - header_height
    content_height = page_height - margin - header_height - margin - footer_height

    c = canvas.Canvas(str(OUTPUT_PATH), pagesize=letter)
    styles = build_styles()

    c.setFillColor(colors.HexColor("#f8fafc"))
    c.rect(0, 0, page_width, page_height, stroke=0, fill=1)

    c.setFillColor(colors.white)
    c.roundRect(margin - 8, margin - 6, page_width - (2 * margin) + 16, page_height - (2 * margin) + 12, 14, stroke=0, fill=1)

    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("Helvetica-Bold", 20)
    c.drawString(margin, page_height - margin - 10, TITLE)

    c.setFillColor(colors.HexColor("#475569"))
    c.setFont("Helvetica", 9)
    c.drawString(margin, page_height - margin - 26, SUBTITLE)

    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.setLineWidth(1)
    c.line(margin, page_height - margin - 36, page_width - margin, page_height - margin - 36)

    left_frame = Frame(
        margin,
        margin + footer_height,
        column_width,
        content_height,
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
        showBoundary=0,
    )
    right_frame = Frame(
        margin + column_width + gutter,
        margin + footer_height,
        column_width,
        content_height,
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
        showBoundary=0,
    )

    left_story = build_story(LEFT_SECTIONS, styles)
    right_story = build_story(RIGHT_SECTIONS, styles)

    left_frame.addFromList(left_story, c)
    right_frame.addFromList(right_story, c)

    footer = Paragraph(
        "Sources used: `README.md`, `package.json`, `prisma/schema.prisma`, `app/page.tsx`, `app/api/checkout/route.ts`, `lib/auth.ts`, `lib/paynow.ts`, `.env.example`.",
        styles["footer"],
    )
    footer.wrapOn(c, page_width - (2 * margin), footer_height)
    footer.drawOn(c, margin, margin - 2)

    c.save()


if __name__ == "__main__":
    generate_pdf()
    print(OUTPUT_PATH)
