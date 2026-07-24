const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');

class JsonDb {
  constructor() {
    this.data = {
      users: [],
      firs: [],
      suspects: [],
      victims: [],
      witnesses: [],
      evidence: [],
      police_stations: [],
      networks: [],
      audit_logs: [],
      cases: []
    };
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(fileContent);
      } catch (err) {
        console.error('Failed to parse database.json, initializing empty DB:', err);
        this.save();
      }
    } else {
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save database:', err);
    }
  }

  // Generic Querying Methods
  getCollection(table) {
    return this.data[table] || [];
  }

  find(table, predicate = () => true) {
    return this.getCollection(table).filter(predicate);
  }

  findOne(table, predicate) {
    return this.getCollection(table).find(predicate);
  }

  insert(table, doc) {
    if (!this.data[table]) {
      this.data[table] = [];
    }
    const newDoc = { id: doc.id || require('crypto').randomUUID(), ...doc, createdAt: new Date().toISOString() };
    this.data[table].push(newDoc);
    this.save();
    return newDoc;
  }

  update(table, id, updates) {
    if (!this.data[table]) return null;
    const index = this.data[table].findIndex(d => d.id === id);
    if (index === -1) return null;

    this.data[table][index] = {
      ...this.data[table][index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data[table][index];
  }

  delete(table, id) {
    if (!this.data[table]) return false;
    const initialLength = this.data[table].length;
    this.data[table] = this.data[table].filter(d => d.id !== id);
    if (this.data[table].length !== initialLength) {
      this.save();
      return true;
    }
    return false;
  }

  // Audit Logger Helper
  logAction(username, role, action, ip, details) {
    this.insert('audit_logs', {
      username,
      role,
      action,
      ip,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Reset database with clean data
  reset(newData) {
    this.data = { ...this.data, ...newData };
    this.save();
  }
}

const db = new JsonDb();
module.exports = db;
