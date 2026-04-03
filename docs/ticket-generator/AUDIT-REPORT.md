# WinFact Ticket Generator — Complete Discovery Audit

> **Audit Date:** 2026-04-03
> **Source Codebase:** `Backup 9-25-25 Working Version/hard_rock_bet-New/`
> **Auditor:** Claude Code (Opus 4.6)

---

## 1. Architecture & Tech Stack

### 1.1 — Language & Framework

- **Language:** Dart 3.7+
- **Framework:** Flutter (cross-platform: Windows, macOS, Linux, Android, iOS, Web)
- **State Management:** Provider (`ChangeNotifierProvider`)
- **UI Paradigm:** Material Design 3 with custom theming
- **Image Generation:** Widget screenshot capture via `screenshot` package (renders Flutter widgets to PNG)

This is NOT Electron, Python, or plain HTML/JS. It's a **Flutter desktop application** primarily targeting Windows.

### 1.2 — Entry Point

**`lib/main.dart`** — Initializes the Flutter app, configures the window (1400x900, starts maximized), and runs `TicketGeneratorApp` with a `BetDataProvider`.

### 1.3 — File & Folder Inventory

```
lib/
├── main.dart                          # App entry point, window config, MaterialApp setup
├── models/
│   ├── app_fonts.dart                 # All font styles (TextStyle definitions) for the ticket
│   ├── bet_data.dart                  # Data models: BetData, TeamData, ParlayLeg
│   └── ticket_colors.dart             # Color constants (UI colors + ticket render colors)
├── providers/
│   └── bet_data_provider.dart         # State management: bet data, payout calc, sub-type lists
├── screens/
│   ├── preview_screen.dart            # Full-size preview screen for generated ticket
│   └── ticket_generator_screen.dart   # Main screen: left panel (form) + right panel (preview)
├── services/
│   └── ticket_generator.dart          # Core engine: validates, captures widget to PNG, saves to disk
├── utils/
│   ├── constants.dart                 # EMPTY FILE (unused)
│   └── helpers.dart                   # EMPTY FILE (unused)
└── widgets/
    ├── actions_section.dart           # Generate/Save/Preview buttons with animations
    ├── bet_details_section.dart       # Team inputs (acronym, score, logo) + odds input
    ├── bet_type_section.dart          # Single/Parlay radio + sub-type dropdown
    ├── logo_section.dart              # Logo folder picker (DEPRECATED - removed from main screen)
    ├── monetary_section.dart          # Wager input + auto-calculated Paid display
    └── ticket_widget.dart             # THE TICKET ITSELF - the visual layout rendered to image

assets/
├── fonts/                             # 21 font files (Neusa family, Poppins, Roboto, Lota Grotesque, MyCustomFont)
└── images/
    ├── hero4_new.png                  # Banner image: scrolling "HARD ROCK BET SPORTSBOOK" + "WINNER" badge
    ├── hardrock_logo.png              # Hard Rock Bet logo (white, used as watermark/overlay)
    ├── copy_icon.png                  # Copy ID icon (white clipboard icon)
    ├── share.png                      # Share icon (white paper airplane)
    ├── share_icon.png                 # Alternate share icon
    ├── copy_id.png                    # Alternate copy icon
    ├── head.png, head1.png, head3.png # Older/alternate banner headers
    ├── img.png, img2.png              # Reference/test images
    └── new.png                        # Unknown reference image
```

### 1.4 — Dependencies

From `pubspec.yaml`:

| Package | Version | Purpose |
|---------|---------|---------|
| `flutter` (SDK) | ^3.7.0 | Core framework |
| `cupertino_icons` | ^1.0.8 | iOS-style icons |
| `file_picker` | ^10.2.0 | Logo file/folder picker |
| `screenshot` | ^3.0.0 | **Captures Flutter widgets as PNG images** |
| `path_provider` | ^2.1.5 | Platform-specific directory paths |
| `flutter_colorpicker` | ^1.1.0 | Color picker (declared but NOT used in code) |
| `provider` | ^6.1.5 | State management |
| `share_plus` | ^11.0.0 | Share files via OS share sheet |
| `uuid` | ^4.5.1 | UUID generation for ticket IDs |
| `archive` | ^4.0.7 | Archive handling (declared but NOT used) |
| `shared_preferences` | ^2.5.3 | Persistent counter for ticket numbering |
| `window_manager` | ^0.3.7 | Desktop window control (size, maximize) |

**Dev dependencies:** `image` ^4.5.4, `flutter_test`, `flutter_lints`

### 1.5 — How It Runs

```batch
flutter run -d windows
```

Launched via `run_ticket.bat` which cleans, gets deps, and runs on Windows. Requires Flutter SDK installed at `C:\flutter\flutter\bin\`.

### 1.6 — Build Step

`flutter build windows` produces a Windows executable in `build/windows/x64/runner/Release/`. The app can also run on macOS, Linux, Android, iOS, and web.

### 1.7 — External APIs & Services

**None.** The app is 100% offline. No network calls, no APIs, no authentication.

### 1.8 — Local Data Storage

- **SharedPreferences:** Stores a ticket counter (`ticket_counter` key) that auto-increments for filenames
- **File system:** Saves generated PNGs to `~/Downloads/HardRockBetTickets/ticket_{N}.png`
- No database, no SQLite, no JSON files

### 1.9 — Authentication / Access Control

**None.** The desktop app has zero auth. Anyone who has the executable can run it.

---

## 2. Ticket Generation Features — Exhaustive Inventory

### 2.1 — Bet Types

| Bet Type | Description |
|----------|-------------|
| **Single** | One bet on one game. Fields: bet description, team1 (acronym + score + logo), team2 (acronym + score + logo), odds, wager |
| **Parlay** | Multi-leg bet. Each leg has: team1 (acronym + score), team2 (acronym + score), odds per leg. Combined odds auto-calculated. |

**No other bet types** (no teasers, round robins, futures, or props).

### 2.2 — Sub-Bet Types (Sport-Agnostic)

The app does NOT have a "Sport" dropdown. Instead, it has a flat list of **bet sub-types** that implicitly cover multiple sports:

#### Single Bet Sub-Types:
| Sub-Type | Display on Ticket | Sports it covers |
|----------|-------------------|-----------------|
| Moneyline | `TO WIN` | All sports |
| Spread | `SPREAD` | All sports |
| Over/Under | `TOTAL` | All sports |
| Total Corners | `TOTAL CORNERS` | Soccer |
| Total Points | `TOTAL POINTS` | Basketball, Football |
| Team To Win | `TO WIN` | All sports |
| 1ST 5 INNINGS TOTAL RUNS | `1ST 5 INNINGS TOTAL RUNS` | MLB |
| 1ST 5 INNINGS TOTAL SPREAD | `1ST 5 INNINGS TOTAL SPREAD` | MLB |
| INNING 1 TOTAL RUNS | `INNING 1 TOTAL RUNS` | MLB |
| GAME RESULT (90 MINUTES + STOPPAGE TIME) | `GAME RESULT (90 MINUTES + STOPPAGE TIME)` | Soccer |

#### Parlay Sub-Types:
| Sub-Type | Legs |
|----------|------|
| 2-Bet Parlay | 2 |
| 3-Bet Parlay | 3 |
| 4-Bet Parlay | 4 |
| 5-Bet Parlay | 5 |
| Custom Parlay | 2-10 (user-specified) |

### 2.3 — Form Fields

#### Single Bet:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Bet Description | Text | Yes | Free-text that appears as the main title on the ticket (e.g., "STL Cardinals -1.5") |
| Team 1 Acronym | Text | Yes | 2-4 letter team abbreviation (e.g., "STL") |
| Team 1 Score | Number | Yes | Final score for team 1 |
| Team 1 Logo | File (image) | No | Optional team logo image file |
| Team 2 Acronym | Text | Yes | 2-4 letter team abbreviation (e.g., "CHW") |
| Team 2 Score | Number | Yes | Final score for team 2 |
| Team 2 Logo | File (image) | No | Optional team logo image file |
| Odds | Text (signed int) | Yes | American odds format (e.g., "-145", "+120") |
| Wager | Currency | Yes | Dollar amount wagered (e.g., "50.00") |
| Paid | Currency | Auto | Auto-calculated from odds + wager |

#### Parlay Bet (per leg):
| Field | Type | Required |
|-------|------|----------|
| Team 1 Acronym | Text | Yes |
| Team 1 Score | Number | Yes |
| Team 1 Logo | File | No |
| Team 2 Acronym | Text | Yes |
| Team 2 Score | Number | Yes |
| Team 2 Logo | File | No |
| Leg Odds | Text (signed int) | Yes |

Plus global: Bet Description, Wager, Paid (auto-calculated from combined parlay odds).

### 2.4 — Odds Format

**American odds only.** Examples: `-145`, `+120`, `-110`, `+350`.

No decimal odds, no fractional odds.

---

## 3. Ticket Output — Visual Specification

### 3.1 — Ticket Dimensions

- **Width:** 875px (container) / 885px (capture viewport)
- **Height:** 820px (container) / 620px (capture viewport — note discrepancy, see bugs section)
- **Border radius:** 15px on the ticket container
- **Output format:** PNG at 1.0x pixel ratio
- **Aspect ratio used for preview:** 885:609

### 3.2 — Visual Layout (Top to Bottom)

#### Banner Header (0-107px from top)
- **Image:** `hero4_new.png` — a pre-rendered PNG banner
- **Content:** Scrolling text pattern: `HARD ROCK BET SPORTSBOOK` repeated in green text on darker green background
- **Second line:** `WINNER` repeated in green text, with one `WINNER` badge in white-on-green rounded rectangle
- **Hard Rock Bet logo** in the top-left corner (white logo on green)
- **Implementation:** This is a **static image** (NOT CSS animation). The scrolling effect is baked into the PNG.
- **Dimensions:** 885px wide x 107px tall, `BoxFit.cover`

#### Main Content Area (starts at 157px from top — 107px banner + 50px gap)
Left-aligned at 40px padding on both sides:

1. **Bet Title Row** (top of content area):
   - **Left:** Bet description text OR parlay badge + title
     - Single: Uses `MyCustomFont` at 35px, color `#FCFCFE`, weight w600, letterSpacing 0.7
     - Parlay: White `PARLAY` badge (white background, green text `#05D17A`, NeusaMedium 25px) + title (NeusaMedium 35px, white)
   - **Right:** Odds display — `MyCustomFont` 32px, `#FCFCFE`, w600, letterSpacing 0.5

2. **Bet Type Label** (8px below title):
   - `NeusaWideMedium` 22px, `#FCFCFE`, letterSpacing 2.5, w600
   - Shows: `TO WIN`, `SPREAD`, `TOTAL`, etc. (see sub-type mapping above)

3. **Wager / Paid Section** (40px below bet type):
   - Two columns separated by 280px:
   - Left column:
     - "Wager" label: `MyCustomFont` 25px, `#FCFCFE`
     - Amount: `MyCustomFont` 53px, `#FCFCFE` (e.g., "$50")
   - Right column:
     - "Paid" label: `MyCustomFont` 25px, `#FCFCFE`
     - Amount: `MyCustomFont` 53px, `#FCFCFE` (e.g., "$84.48")

#### Final Score Bar (positioned at bottom - 32px, single bets only)
- **Container:** Rounded rectangle, 85px tall, `#EEEDF3` background, border-radius 14px
- **Center text:** "Final Score" — `MyCustomFont` 27px, `#41414D`
- **Left side** (20px from left, 17px from top):
  - Optional team logo (40px height)
  - Team 1 acronym: `NeusaMedium` 35px, `#414149`, w600
  - Score box: 50x50px, `#DADAE4` background, border-radius 10px
    - Score text: `MyCustomFont` 26px, `#1A181B`, w700
- **Right side** (20px from right, mirrored):
  - Score box → Team 2 acronym → Optional logo

#### Footer Row (40px below score bar)
- **Left:** `ID: {19-digit random number}` — `MyCustomFont` 21px, `#FCFCFE` + copy icon (30px)
- **Right:** "Share" text — `MyCustomFont` 30px, `#FCFCFE` + share icon (38px, tinted `#FCFBF8`, shifted up 3px)

#### Parlay-specific footer (below footer row)
- Divider: white, 1px thick
- "Show selections" text + down arrow icon (centered)
- Text: `MyCustomFont` 22px, white

### 3.3 — Complete Color Palette

#### Ticket Render Colors:
| Element | Hex | Description |
|---------|-----|-------------|
| Ticket background | `#05D17A` | Main green background |
| Banner background | `#009154` | Darker green (in banner image) |
| Banner text | `#048E56` | Green text on banner |
| Winner text | `#FCFCFE` | Near-white |
| Main text | `#FCFCFE` | All primary text on green |
| Score container | `#EEEDF3` | Light gray bar |
| Score boxes | `#DADAE4` | Score number background |
| Team acronyms | `#414149` | Dark gray for acronyms |
| Score numbers | `#41414D` | Dark for "Final Score" label |
| Final score label | `#555360` | Slightly lighter (defined but `#41414D` used in code) |
| Parlay badge text | `#05D17A` | Green text in white badge |
| Parlay badge bg | `#FFFFFF` | White badge |
| Score number text | `#1A181B` | Near-black for actual scores |
| Share icon tint | `#FCFBF8` | Slightly warm white |

#### App UI Colors (form/chrome, NOT ticket):
| Element | Hex |
|---------|-----|
| Background | `#F2F2F7` |
| Card | `#FFFFFF` |
| Primary blue | `#007AFF` |
| Light blue | `#E3F2FF` |
| Hover blue | `#0051D5` |
| Text primary | `#1C1C1E` |
| Text secondary | `#8E8E93` |
| Border | `#E5E5EA` |
| Success | `#34C759` |
| Error | `#FF3B30` |
| Warning | `#FF9500` |
| Shadow | `#1A000000` (10% black) |

### 3.4 — Font Inventory

| Font Family | Flutter Alias | Font File | Used For |
|-------------|--------------|-----------|----------|
| Neusa Bold | `NeusaBold` | Neusa-Bold.otf | (available but not explicitly used in ticket) |
| Neusa Condensed Medium | `NeusaCM` | Neusa-CondensedMedium.otf | (available but not explicitly used) |
| Neusa Medium | `NeusaM` | Neusa-Medium.otf | Team acronyms (35px), parlay badge (25px), parlay title (35px) |
| Neusa Wide Medium | `NeusaWM` | Neusa-WideMedium.otf | Bet type display (22px, letterSpacing 2.5) |
| Neusa Wide Regular | `NeusaWR` | Neusa-WideRegular.otf | (available but not explicitly used) |
| Neusa Thin | `NeusaT` | Neusa-Thin.otf | (available but not explicitly used) |
| MyCustomFont | `MyCustomFont` | MyCustomFont-Regular.otf | **Primary ticket font**: bet title (35px), odds (32px), wager/paid labels (25px), wager/paid amounts (53px), final score label (27px), score numbers (26px), ticket ID (21px), share text (30px), show selections (22px) |
| Poppins SemiBold | `PoppinsSM` | Poppins-SemiBold.ttf | (declared but not used in ticket) |
| Roboto Light | `RobotoL` | Roboto-Light.ttf | (declared but not used in ticket) |
| Roboto Regular | `RobotoR` | Roboto-Regular.ttf | (declared but not used in ticket) |
| Lota Grotesque (8 variants) | Not registered | Various .otf files | **NOT registered in pubspec.yaml** — unused dead assets |

**Critical fonts for web port:** `MyCustomFont-Regular.otf` (primary), `Neusa-Medium.otf`, `Neusa-WideMedium.otf`

### 3.5 — Ticket ID Format

- **19-digit random number** (first digit always 1-9, remaining 18 digits 0-9)
- Generated client-side with `dart:math.Random()`
- Example: `4738291056483729103`
- **NOT** the UUID — the UUID is only used for internal file tracking. The displayed ID is numeric-only.

### 3.6 — Export Pipeline

1. `TicketWidget` (Flutter widget) is built with bet data
2. `ScreenshotController.captureFromWidget()` renders it at 885x620 viewport, 1.0x pixel ratio
3. Result: `Uint8List` (PNG bytes)
4. Saved to `~/Downloads/HardRockBetTickets/ticket_{counter}.png`
5. Counter persists via `SharedPreferences`

**Save button:** Copies PNG to app documents directory + opens OS share sheet
**Preview button:** Opens full-screen preview of the generated image
**Generate button:** Creates/refreshes the PNG

---

## 4. Payout Calculation Logic

### 4.1 — Single Bet Payout

Located in `bet_data_provider.dart:108-128`:

```dart
double calculatePayout(String oddsStr, String wagerStr) {
  final odds = int.tryParse(oddsStr.replaceAll('+', '')) ?? 0;
  final wager = double.tryParse(wagerStr.replaceAll('$', '')) ?? 0.0;
  
  double profit;
  if (odds > 0) {
    profit = wager * (odds / 100);        // Underdog: profit = wager * (odds/100)
  } else {
    profit = wager * (100 / odds.abs());   // Favorite: profit = wager * (100/|odds|)
  }
  
  totalPayout = wager + profit;            // Total = wager + profit
  return rounded to 2 decimal places;
}
```

**Verification:**
- Wager $100, Odds -150: profit = 100 * (100/150) = $66.67 → Paid = $166.67 ✅
- Wager $100, Odds +200: profit = 100 * (200/100) = $200 → Paid = $300 ✅
- Wager $50, Odds -110: profit = 50 * (100/110) = $45.45 → Paid = $95.45 ✅

**Math is correct for standard American odds.**

### 4.2 — Parlay Payout

Located in `bet_data_provider.dart:131-165`:

```
1. Convert each leg's American odds to decimal:
   - Positive: decimal = 1 + (odds / 100)
   - Negative: decimal = 1 + (100 / |odds|)
2. Multiply all decimal odds together: combined = leg1 * leg2 * ... * legN
3. Convert back to American:
   - If combined >= 2.0: american = (combined - 1) * 100
   - If combined < 2.0: american = -100 / (combined - 1)
4. Apply single bet payout formula with combined odds
```

**Verification (2-leg parlay: -110 and -110):**
- Leg 1 decimal: 1 + (100/110) = 1.909
- Leg 2 decimal: 1 + (100/110) = 1.909
- Combined: 1.909 * 1.909 = 3.644
- American: (3.644 - 1) * 100 = +264
- $100 wager at +264: profit = 100 * (264/100) = $264 → Paid = $364 ✅

**The parlay math is correct** — standard multiplicative decimal odds conversion.

### 4.3 — Edge Cases

- **Even money (+100):** profit = wager * (100/100) = wager → Paid = 2x wager ✅
- **Zero odds (0):** Returns 0.0 (safe guard)
- **Empty wager:** Returns 0.0
- **Pushes/voids/cancelled legs:** NOT handled. No logic for push or void scenarios.
- **Invalid odds format:** Falls through to 0.0 return

---

## 5. Code Quality & Patterns

### 5.1 — Structure Assessment

**Overall: Well-structured, clean separation of concerns.** The codebase follows a clear MVC-like pattern:
- Models: Data classes with `copyWith` (immutable-friendly)
- Providers: Business logic + state
- Widgets: UI components
- Services: Image generation engine
- Screens: Page-level compositions

### 5.2 — Bugs & Issues

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| 1 | **Medium** | `ticket_widget.dart:72-73` | Container is 875x**820** but capture viewport is 885x**620**. The ticket is taller than the capture area, meaning the bottom (score bar, footer) may be clipped in the PNG output. |
| 2 | **Low** | `ticket_widget.dart:425-431` | `_getOddsDisplay()` for parlays **hardcodes** `+782` instead of calculating combined odds. This means parlay tickets always show "+782" regardless of actual odds. |
| 3 | **Low** | `ticket_widget.dart:361-389` | `_getBetTitle()` references `betData.team1!.name` and `betData.team2!.name` which are unused form fields (only acronyms are collected). Will always show empty string for auto-generated titles. The `betDescription` field overrides this, so it works in practice. |
| 4 | **Low** | `actions_section.dart:56-59` | Generate button reuses stale cached image instead of re-generating when bet data changes. The cache is cleared on data change, but the logic checks the old path first. |
| 5 | **Info** | `utils/constants.dart`, `utils/helpers.dart` | Both files are empty (1 line each). Dead files. |
| 6 | **Info** | `logo_section.dart` | Entire widget is deprecated/removed from the main screen but file still exists. |
| 7 | **Info** | `pubspec.yaml` | `flutter_colorpicker` and `archive` packages declared but never imported in code. |
| 8 | **Info** | `ticket_widget.dart:18-22` | Ticket ID is generated fresh on every build (not memoized), so the ID changes between preview and save. |

### 5.3 — Hardcoded Values

- Ticket dimensions (875x820, 885x620)
- All font sizes (35, 32, 22, 53, 27, 26, 25, 21, 30, 22)
- All color values
- Spacing values (40px padding, 280px between wager/paid, 50px gap, etc.)
- Score box size (50x50)
- Banner height (107px)
- Parlay odds display hardcoded to "+782"
- Download folder name "HardRockBetTickets"

### 5.4 — No Test Coverage

Zero test files. The `test/` directory has only a default Flutter widget test scaffold.

---

## 6. Known Limitations

1. **No sport selector** — sub-types are sport-agnostic; user must know which sub-type applies to their sport
2. **Parlay odds display bug** — always shows "+782" on the ticket regardless of actual combined odds
3. **No date/time on ticket** — tickets don't display when the bet was placed
4. **No book name customization** — hardcoded to Hard Rock Bet
5. **Single bet only shows one score bar** — no support for multi-period or quarter scores
6. **Parlay tickets don't show individual leg details** — only "Show selections" collapsed view
7. **Logo support is inconsistent** — logos can be added per team but the folder picker is removed
8. **No undo/reset** — no way to clear the form and start fresh
9. **Ticket height mismatch** — widget is 820px tall but captured at 620px viewport
10. **Offline only** — requires Flutter desktop runtime, can't be used on web
11. **Windows-focused** — bat file points to Windows-specific paths
12. **No support for half-point spreads display** — the spread number doesn't appear on the ticket
13. **Currency formatting inconsistency** — three separate `_formatCurrency` / `_formatCurrencyWithCommas` implementations

---

## 7. Assets Inventory

### 7.1 — Images Required for Web Port

| File | Dimensions | Purpose | Must port? |
|------|-----------|---------|------------|
| `hero4_new.png` | 885x107px | Banner with scrolling text + WINNER badge | **YES - Critical** |
| `copy_icon.png` | ~50x50px | Copy ID button icon (white) | **YES** |
| `share.png` | ~300x300px | Share button icon (white paper airplane) | **YES** |
| `hardrock_logo.png` | ~200x150px | Hard Rock Bet logo (white, transparent bg) | Optional (embedded in banner already) |

### 7.2 — Fonts Required for Web Port

| Font File | Priority |
|-----------|----------|
| `MyCustomFont-Regular.otf` | **Critical** — used for 80% of ticket text |
| `Neusa-Medium.otf` | **Critical** — team acronyms, parlay badge |
| `Neusa-WideMedium.otf` | **Critical** — bet type display |
| `Neusa-Bold.otf` | Nice-to-have |
| `Poppins-SemiBold.ttf` | Not needed for ticket |
| `Roboto-Light.ttf` / `Roboto-Regular.ttf` | Not needed for ticket |
| All Lota Grotesque variants | Not needed (never registered) |
