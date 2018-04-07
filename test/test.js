const chai = require('chai')
const expect = chai.expect

const EncryptSqlite = require('../main.js')

function testDb() {
	let db = new EncryptSqlite('password')
	db.query('CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)')

	for (let i=0; i < 25; i++) {
		db.query(`INSERT INTO test (content) VALUES ('Test subject #${i}')`)
	}

	return db
}

describe('EncryptSqlite', () => {

	describe('new', () => {
		it('should create a new db instance', () => {
			let db = new EncryptSqlite('password')

			expect(db).to.be.a('object')
		})

		it('should fail without a password', () => {
			expect(() => {let db = new EncryptSqlite()}).to.throw()
		})

		it('should open encrypted databases', () => {
			let db = new EncryptSqlite('password')

			db.query('CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)')
			let content = 'test'
			db.query(`INSERT INTO test (content) VALUES ('${content}')`)

			let blob = db.export()

			db = new EncryptSqlite('password', blob)
			let results = db.query('SELECT * FROM test')

			expect(results[0].content).to.equal(content)
		})
	})


	describe('.query', () => {

		let db = new EncryptSqlite('password')

		it('should run a sql query', () => {
			let result = db.query('CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)')

			expect(result).to.be.a('array').with.lengthOf(0)
		})

		it('should throw exceptions on bad sql', () => {
			expect(() => {
				db.query('SELECT ALL WHERE this is not sql. HAHAHA you thought it was but its not, now you look quite the fool.')
			}).to.throw('near')
		})

		it('should return an array of rows on select', () => {
			let content = 'This is just a test.'
			db.query(`INSERT INTO test (content) VALUES ('${content}')`)

			let result = db.query('SELECT * FROM test ORDER BY id DESC')

			expect(result).to.be.a('array')
			expect(result[0]).to.be.a('object').with.property('content')
			expect(result[0].content).to.equal(content)
		})

		it('should bind parameters into an sql query', () => {
			let content = 'This is just a jest.'
			db.query('INSERT INTO test (content) VALUES (?)', [content])

			let result = db.query('SELECT * FROM test ORDER BY id DESC')

			expect(result).to.be.a('array')
			expect(result[0]).to.be.a('object').with.property('content')
			expect(result[0].content).to.equal(content)
		})

		it('should escape the parameters', () => {
			let content = 'This is not a test this is "JuStIcE" \'?\''
			db.query('INSERT INTO test (content) VALUES (?)', [content])

			let result = db.query('SELECT * FROM test ORDER BY id DESC')

			expect(result).to.be.a('array')
			expect(result[0]).to.be.a('object').with.property('content')
			expect(result[0].content).to.equal(content)
		})
	})

	describe('.prepare', () => {

		let db = new EncryptSqlite('password')

		it('should take a query and return a statement object', () => {
			let stmt = db.prepare('CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)')

			expect(stmt).to.be.a('object')
		})

		it('should throw error on bad sql', () => {
			expect(() => {
				db.prepare('CREATE foo')
			}).to.throw('near')
		})
	})

	describe('.export', () => {
		let db = new EncryptSqlite('password')

		db.query('CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)')

		it('should export the database in encrypted base64', () => {
			let dump = db.export()

			expect(dump).to.be.a('string')
		})
	})

	describe('.close', () => {
		let db = new EncryptSqlite('password')

		db.query('CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)')

		it('should close the database', () => {
			db.close()
		})
	})

	describe('.on', () => {
		let db = new EncryptSqlite('password')

		it('should take a callback', () => {
			var hit = false
			db.on('write', (data) => {
				expect(data).to.be.a('string')
			})
		})

		it('should take a call back all writers on write sql', () => {
			var hit = false
			db.on('write', (data) => {
				expect(data).to.be.a('string')
				hit = true
			})

			// should cause a db write
			db.query('CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)')

			expect(hit).to.equal(true)
		})

		it('should be transaction safe', () => {
			db = new EncryptSqlite('password')

			let writeCount = 0

			db.on('write', (data) => {
				writeCount++
			})

			db.begin()
			db.query('CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)')
			for (let i = 0; i < 25; i++) {
				db.query(`INSERT INTO test (content) VALUES ('test db insert ${i}')`)
			}
			db.
		})
	})
})
