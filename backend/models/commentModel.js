
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const commentModel = {
  // Create a new comment
  async create(commentData) {
    try {
      const { id, content, userId, jobId, createdAt, updatedAt } = commentData;
      
      const query = `
        INSERT INTO "Comments" (id, content, "userId", "jobId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [id, content, userId, jobId, createdAt, updatedAt];
      
      // Check if table exists, if not, create it
      await this.ensureTable();
      
      const result = await db.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  },
  
  // Find all comments for a job
  async findByJobId(jobId) {
    try {
      // Check if table exists, if not, create it
      await this.ensureTable();
      
      const query = `
        SELECT c.*, r.id as "replyId", r.content as "replyContent", 
               r."userId" as "replyUserId", r."commentId", r."createdAt" as "replyCreatedAt", 
               r."updatedAt" as "replyUpdatedAt"
        FROM "Comments" c
        LEFT JOIN "Replies" r ON c.id = r."commentId"
        WHERE c."jobId" = $1
        ORDER BY c."createdAt" DESC, r."createdAt" ASC
      `;
      
      const result = await db.query(query, [jobId]);
      
      // Group replies by comment
      const commentMap = new Map();
      
      result.rows.forEach(row => {
        const commentId = row.id;
        
        if (!commentMap.has(commentId)) {
          // Create comment object
          commentMap.set(commentId, {
            id: commentId,
            content: row.content,
            userId: row.userId,
            jobId: row.jobId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            replies: []
          });
        }
        
        // Add reply if it exists
        if (row.replyId) {
          const comment = commentMap.get(commentId);
          
          // Check if reply already exists in the array
          const replyExists = comment.replies.some(reply => reply.id === row.replyId);
          
          if (!replyExists) {
            comment.replies.push({
              id: row.replyId,
              content: row.replyContent,
              userId: row.replyUserId,
              commentId: row.commentId,
              createdAt: row.replyCreatedAt,
              updatedAt: row.replyUpdatedAt
            });
          }
        }
      });
      
      // Convert map to array
      return Array.from(commentMap.values());
    } catch (error) {
      console.error('Error finding comments by job ID:', error);
      return [];
    }
  },
  
  // Find comment by ID
  async findById(commentId) {
    try {
      // Check if table exists, if not, create it
      await this.ensureTable();
      
      const query = `
        SELECT * FROM "Comments"
        WHERE id = $1
      `;
      
      const result = await db.query(query, [commentId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      // Get replies for this comment
      const repliesQuery = `
        SELECT * FROM "Replies"
        WHERE "commentId" = $1
        ORDER BY "createdAt" ASC
      `;
      
      const repliesResult = await db.query(repliesQuery, [commentId]);
      
      return {
        ...result.rows[0],
        replies: repliesResult.rows
      };
    } catch (error) {
      console.error('Error finding comment by ID:', error);
      return null;
    }
  },
  
  // Delete a comment
  async delete(commentId) {
    try {
      // Check if table exists, if not, create it
      await this.ensureTable();
      
      // First delete all replies for this comment
      await db.query(`DELETE FROM "Replies" WHERE "commentId" = $1`, [commentId]);
      
      // Then delete the comment
      await db.query(`DELETE FROM "Comments" WHERE id = $1`, [commentId]);
      
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  },
  
  // Add reply to a comment
  async addReply(commentId, replyData) {
    try {
      const { id, content, userId, createdAt, updatedAt } = replyData;
      
      // Check if comments table exists, if not, create it
      await this.ensureTable();
      
      // Check if replies table exists, if not, create it
      await this.ensureRepliesTable();
      
      const query = `
        INSERT INTO "Replies" (id, content, "userId", "commentId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [id, content, userId, commentId, createdAt, updatedAt];
      
      const result = await db.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error adding reply:', error);
      throw error;
    }
  },
  
  // Find reply by ID
  async findReplyById(replyId) {
    try {
      // Check if table exists, if not, create it
      await this.ensureRepliesTable();
      
      const query = `
        SELECT * FROM "Replies"
        WHERE id = $1
      `;
      
      const result = await db.query(query, [replyId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error finding reply by ID:', error);
      return null;
    }
  },
  
  // Delete a reply
  async deleteReply(replyId) {
    try {
      // Check if table exists, if not, create it
      await this.ensureRepliesTable();
      
      await db.query(`DELETE FROM "Replies" WHERE id = $1`, [replyId]);
      
      return true;
    } catch (error) {
      console.error('Error deleting reply:', error);
      throw error;
    }
  },
  
  // Ensure Comments table exists
  async ensureTable() {
    try {
      // Check if table exists
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'Comments'
        );
      `);
      
      const tableExists = tableCheck.rows[0].exists;
      
      if (!tableExists) {
        console.log('Creating Comments table...');
        
        // Create table
        await db.query(`
          CREATE TABLE "Comments" (
            id UUID PRIMARY KEY,
            content TEXT NOT NULL,
            "userId" UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
            "jobId" UUID NOT NULL REFERENCES "Jobs"(id) ON DELETE CASCADE,
            "createdAt" TIMESTAMP NOT NULL,
            "updatedAt" TIMESTAMP NOT NULL
          );
        `);
        
        console.log('Comments table created successfully');
      }
    } catch (error) {
      console.error('Error ensuring Comments table exists:', error);
      throw error;
    }
  },
  
  // Ensure Replies table exists
  async ensureRepliesTable() {
    try {
      // Check if table exists
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'Replies'
        );
      `);
      
      const tableExists = tableCheck.rows[0].exists;
      
      if (!tableExists) {
        console.log('Creating Replies table...');
        
        // Create table
        await db.query(`
          CREATE TABLE "Replies" (
            id UUID PRIMARY KEY,
            content TEXT NOT NULL,
            "userId" UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
            "commentId" UUID NOT NULL REFERENCES "Comments"(id) ON DELETE CASCADE,
            "createdAt" TIMESTAMP NOT NULL,
            "updatedAt" TIMESTAMP NOT NULL
          );
        `);
        
        console.log('Replies table created successfully');
      }
    } catch (error) {
      console.error('Error ensuring Replies table exists:', error);
      throw error;
    }
  }
};

module.exports = commentModel;
