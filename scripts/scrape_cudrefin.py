#!/usr/bin/env python3
"""
Scraper du site cudrefin.ch pour nourrir le chatbot communal.
Scrape chaque page, extrait le contenu texte, et l'injecte dans Supabase.

Usage:
  python3 scripts/scrape_cudrefin.py
"""

import subprocess
import re
import json
import os
import sys
from datetime import datetime

# Configuration
BOT_ID = "kD99Peb67QF7"
API_BASE = "https://cudrefin-chatbot.onrender.com"
SUPABASE_URL = "https://mtjnrbknwmnbtzqljxkw.supabase.co"
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# Toutes les pages à scraper avec catégories
PAGES = [
    # --- Pages principales ---
    ("/", "Accueil", "Accueil - Commune de Cudrefin"),
    
    # --- Administration ---
    ("/administration", "Administration communale", "Administration"),
    ("/administration/greffe-municipal", "Secrétariat municipal (Greffe)", "Administration"),
    ("/administration/office-de-la-population", "Office de la population", "Administration"),
    ("/administration/services-de-voirie", "Service de voirie", "Administration"),
    ("/administration/service-technique", "Service technique", "Administration"),
    ("/administration/service-des-ports", "Service des ports", "Administration"),
    ("/administration/services-des-bourses", "Bourse communale (Impôts)", "Administration"),
    
    # --- Sous-pages Greffe ---
    ("/administration/greffe-municipal/cartes-journalieres-cff-degriffees", "Cartes journalières CFF", "Administration"),
    ("/administration/greffe-municipal/entreprises", "Annuaire des entreprises", "Administration"),
    
    # --- Sous-pages Voirie ---
    ("/administration/services-de-voirie/dechetterie-de-cudrefin", "Déchetterie de Cudrefin", "Administration"),
    
    # --- Autorités ---
    ("/autorites/municipalite-cudrefin", "Municipalité", "Autorités"),
    ("/autorites/conseil-communal", "Conseil Communal", "Autorités"),
    
    # --- Vivre à Cudrefin ---
    ("/vivre-a-cudrefin", "Vivre à Cudrefin", "Vivre à Cudrefin"),
    ("/vivre-a-cudrefin/urgences", "Urgences", "Vivre à Cudrefin"),
    ("/vivre-a-cudrefin/histoire-de-cudrefin", "Histoire de Cudrefin", "Vivre à Cudrefin"),
    ("/vivre-a-cudrefin/ecoles-et-parascolaire", "Ecoles et parascolaire", "Vivre à Cudrefin"),
    ("/vivre-a-cudrefin/pour-les-12-a-25-ans", "Pour les 12 à 25 ans", "Vivre à Cudrefin"),
    ("/vivre-a-cudrefin/pour-les-aines", "Pour les ainés", "Vivre à Cudrefin"),
    ("/vivre-a-cudrefin/sports-et-loisirs", "Sports et loisirs", "Vivre à Cudrefin"),
    ("/vivre-a-cudrefin/poste", "Poste", "Vivre à Cudrefin"),
    ("/vivre-a-cudrefin/societes-locales-asl", "Sociétés villageoises (ASL)", "Vivre à Cudrefin"),
    ("/vivre-a-cudrefin/stationnement", "Stationnement", "Vivre à Cudrefin"),
    
    # --- Tourisme ---
    ("/tourisme", "Tourisme", "Tourisme"),
    
    # --- Démarches et infos ---
    ("/toutes-les-demarches", "Toutes les démarches", "Démarches"),
    ("/reglements", "Règlements communaux", "Démarches"),
    ("/emplois", "Emplois", "Démarches"),
    ("/evenements", "Événements", "Démarches"),
]

def curl_get(url):
    """Récupère le HTML d'une URL avec curl."""
    full_url = f"https://www.cudrefin.ch{url}"
    try:
        result = subprocess.run(
            ["curl", "-sL", "--max-time", "15", full_url],
            capture_output=True, text=True, timeout=20
        )
        return result.stdout, None
    except Exception as e:
        return None, str(e)

def extract_main_text(html):
    """Extrait le texte propre du <main> d'une page Peak CMS."""
    if not html:
        return None
    
    # Extraire la balise <main>
    m = re.search(r'<main[^>]*>(.*?)</main>', html, re.DOTALL)
    if not m:
        # Fallback: essayer body
        m = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL)
    if not m:
        return None
    
    content = m.group(1)
    
    # Extraire le titre
    title_m = re.search(r'<h1[^>]*>(.*?)</h1>', content, re.DOTALL)
    title = title_m.group(1).strip() if title_m else ""
    
    # Nettoyer le HTML → texte
    text = content
    
    # Remplacer les balises de paragraphe/liste par des nouvelles lignes
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'</(p|div|li|h[1-6]|tr|section|article)>', '\n', text)
    text = re.sub(r'<li[^>]*>', '  • ', text)
    
    # Supprimer toutes les autres balises
    text = re.sub(r'<[^>]+>', '', text)
    
    # Nettoyer les espaces
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()
    
    return text

def format_document(slug, page_title, category, raw_text):
    """Formate le texte extrait en document Markdown propre."""
    full_url = f"https://www.cudrefin.ch{slug}"
    
    lines = []
    lines.append(f"# {page_title}")
    lines.append("")
    lines.append(f"*Source : [{full_url}]({full_url})*")
    lines.append(f"*Catégorie : {category}*")
    lines.append(f"*Dernière mise à jour : {datetime.now().strftime('%d.%m.%Y')}*")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append(raw_text)
    lines.append("")
    lines.append("---")
    lines.append(f"*Source : [{full_url}]({full_url})*")
    
    return "\n".join(lines)

def inject_to_supabase(doc_filename, doc_content):
    """Injecte un document dans Supabase via l'API REST."""
    if not SUPABASE_SERVICE_KEY:
        print(f"  ⚠️  Pas de SUPABASE_SERVICE_KEY, Skip injection")
        return False
    
    # Appel direct à l'API Supabase REST
    headers = [
        "-H", f"apikey: {SUPABASE_SERVICE_KEY}",
        "-H", f"Authorization: Bearer {SUPABASE_SERVICE_KEY}",
        "-H", "Content-Type: application/json",
        "-H", "Prefer: return=minimal"
    ]
    
    data = json.dumps({
        "bot_id": BOT_ID,
        "filename": doc_filename,
        "mime": "text/markdown",
        "extracted_text": doc_content,
        "char_count": len(doc_content),
        "size_bytes": len(doc_content.encode('utf-8')),
    })
    
    result = subprocess.run(
        ["curl", "-s", "-X", "POST", 
         f"{SUPABASE_URL}/rest/v1/documents"] + headers + [
         "-d", data],
        capture_output=True, text=True, timeout=15
    )
    
    if result.returncode == 0:
        return True
    else:
        print(f"    Erreur injection: {result.stderr[:200]}")
        return False

def main():
    print("=" * 60)
    print(f"🌐 Scraping du site cudrefin.ch — {len(PAGES)} pages")
    print(f"🤖 Bot cible : {BOT_ID}")
    print("=" * 60)
    print()
    
    scraped = []
    errors = []
    
    for i, (slug, page_title, category) in enumerate(PAGES, 1):
        print(f"[{i:02d}/{len(PAGES)}] {page_title}... ", end="", flush=True)
        
        html, err = curl_get(slug)
        if err:
            print(f"❌ Erreur curl: {err[:80]}")
            errors.append((slug, page_title, err))
            continue
        
        raw_text = extract_main_text(html)
        if not raw_text or len(raw_text) < 20:
            print(f"⚠️  Contenu insuffisant (< 20 chars)")
            errors.append((slug, page_title, "Contenu insuffisant"))
            continue
        
        char_count = len(raw_text)
        print(f"✅ {char_count} chars")
        
        # Formater en document Markdown
        filename = f"cudrefin-{slug.strip('/').replace('/', '-') or 'accueil'}.md"
        doc_content = format_document(slug, page_title, category, raw_text)
        
        scraped.append((filename, page_title, category, char_count, doc_content))
    
    print()
    print("=" * 60)
    print(f"📊 Résultat du scraping : {len(scraped)} pages réussies / {len(errors)} erreurs")
    print("=" * 60)
    
    if errors:
        print("\n⚠️  Erreurs :")
        for slug, title, err in errors:
            print(f"  • {title} ({slug}) : {err}")
    
    print()
    print("=" * 60)
    print(f"💉 Injection dans Supabase (bot {BOT_ID})...")
    print("=" * 60)
    
    success = 0
    failed = 0
    for filename, page_title, category, char_count, doc_content in scraped:
        print(f"  📄 {page_title} ({char_count} chars)... ", end="", flush=True)
        ok = inject_to_supabase(filename, doc_content)
        if ok:
            print("✅")
            success += 1
        else:
            print("❌")
            failed += 1
    
    print()
    print("=" * 60)
    print(f"✅ Injection terminée : {success} documents importés / {failed} échecs")
    
    # Afficher la liste pour vérification
    print()
    print("📋 Documents importés :")
    total_chars = 0
    for filename, page_title, category, char_count, _ in scraped:
        print(f"  • [{category}] {page_title} ({char_count:,} chars)")
        total_chars += char_count
    print(f"\n📊 Total : {len(scraped)} documents, {total_chars:,} caractères")
    
    if errors:
        sys.exit(1)

if __name__ == "__main__":
    main()
