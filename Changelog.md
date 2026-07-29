Changelog

All notable changes to Coeus Test Writer are documented here.

[2.1.1] - 2026-07-29
Added
Footer with About modal, GitHub link, Download Latest, Report a Bug, and AGPLv3 license badge
About section with project description, tech stack, and credits
Version number (APP_VERSION) constant in main.js, displayed in footer and About modal
Export as GIFT in Question Manager (Bank Editor)
Choice E option in Add New Question form (MCQ)
Balanced Pick Across Categories in Test Generator — auto-distributes target question counts evenly across all categories
Zero-padded question numbering in GIFT export (e.g. Q01, Q04)
Changed
Renamed "Export as Plain Text" to "Export TXT" in Question Manager
Answer key in TXT export now uses line breaks between entries instead of spaces
Fixed
Hidden Choice E row excluded from form validation and submission
Choice E row resets after question is submitted
