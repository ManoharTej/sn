import sqlite3

domains = {
    "Platform Overview and Navigation": ["navigation", "banner", "impersonate", "profile", "overview", "unified", "next experience", "instance"],
    "Instance Configuration": ["plugin", "personalize", "customize", "branding", "ui properties", "theme"],
    "Configuring Applications for Collaboration": ["list", "filter", "tag", "form", "template", "task", "vtb", "visual task board", "dashboard", "notification", "email", "report", "view"],
    "Self Service & Automation": ["knowledge", "catalog", "workflow", "flow designer", "virtual agent", "item", "order guide", "record producer"],
    "Data Migration and Integration": ["ui policy", "business rule", "update set", "script", "import", "transform", "integration", "rest", "soap", "mid server", "discovery"],
    "Database Management and Platform Security": ["table", "field", "schema", "acl", "access control", "role", "group", "security", "cmdb", "csdm", "data dict", "reference"]
}

conn = sqlite3.connect('csa_training.db')
c = conn.cursor()

try:
    c.execute("ALTER TABLE questions ADD COLUMN domain VARCHAR(255)")
    conn.commit()
except sqlite3.OperationalError:
    pass # column might already exist

c.execute("SELECT id, question_text, explanation FROM questions")
rows = c.fetchall()

for row in rows:
    qid = row[0]
    qtext = row[1].lower() + " " + row[2].lower()
    
    assigned_domain = "Database Management and Platform Security" # default
    
    # Simple heuristic
    for domain, kws in domains.items():
        if any(kw in qtext for kw in kws):
            assigned_domain = domain
            # We assign to first match except we want best match, but simple is fine
            break

    c.execute("UPDATE questions SET domain = ? WHERE id = ?", (assigned_domain, qid))

conn.commit()
print("Updated all questions with domains!")
