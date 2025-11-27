// models/database.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Pool de connexions MariaDB
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
pool;

export default {
    // Fonctions CRUD
    getAllTodos: async () => {
        const [rows] = await pool.query('SELECT * FROM todos');
        return rows;
    },

    // VERSION VULNÉRABLE - NE PAS UTILISER EN PRODUCTION
    getTodoById: async (id) => {
        const [rows] = await pool.query('SELECT * FROM todos WHERE id = ?', [id]);
        console.log("SQL result", rows)
        return rows[0];
    },


    createTodo: async ({ name, priority = 1, done = false }) => {
        const [result] = await pool.query(
            'INSERT INTO todos (name, priority, done) VALUES (?, ?, ?)',
            [name, priority, done]
        );
        return getTodoById(result.insertId);
    },

    replaceTodo: async (id, { name, priority, done }) => {
        await pool.query(
            'UPDATE todos SET name = ?, priority = ?, done = ? WHERE id = ?',
            [name, priority, done, id]
        );
        return getTodoById(id);
    },

    updateTodo: async (id, data) => {
        // Construction dynamique de la requête PATCH
        const fields = [];
        const values = [];
        if (data.name !== undefined) {
            fields.push('name = ?');
            values.push(data.name);
        }
        if (data.priority !== undefined) {
            fields.push('priority = ?');
            values.push(data.priority);
        }
        if (data.done !== undefined) {
            fields.push('done = ?');
            values.push(data.done);
        }
        if (fields.length === 0) return getTodoById(id);
        values.push(id);
        await pool.query(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`, values);
        return getTodoById(id);
    },

    deleteTodo: async (id) => {
        await pool.query('DELETE FROM todos WHERE id = ?', [id]);
    },

    deleteAllTodos: async () => {
        const [result] = await pool.query('DELETE FROM todos');
        return result.affectedRows;
    },

    getStats: async () => {
        const [total] = await pool.query('SELECT COUNT(*) as total FROM todos');
        const [completed] = await pool.query('SELECT COUNT(*) as completed FROM todos WHERE done = true');
        const [byPriority] = await pool.query(
            `SELECT 
      SUM(priority = 1) as high, 
      SUM(priority = 2) as medium, 
      SUM(priority = 3) as low 
    FROM todos`
        );
        return {
            total: total[0].total,
            completed: completed[0].completed,
            pending: total[0].total - completed[0].completed,
            completionRate: total[0].total > 0 ? Math.round((completed[0].completed / total[0].total) * 100) : 0,
            byPriority: byPriority[0]
        };
    }
}
