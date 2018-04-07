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

describe('EncryptSqlite Statement', () => {
	describe('.getResults', () => {

		let db = testDb()

		it('should return an array of rows on select', () => {
			let stmt = db.prepare('SELECT * FROM test')

			let result = stmt.getResults()

			expect(result).to.be.a('array').with.lengthOf(25)
			expect(result[0]).to.be.a('object').with.property('content')
		})

		it('should optionaly take parameters and pass to bind', () => {
			let stmt = db.prepare('SELECT * FROM test WHERE id = ?')

			let id = 4
			let result = stmt.getResults([id])

			expect(result).to.be.a('array').with.lengthOf(1)
			expect(result[0]).to.be.a('object').with.property('content')
			expect(result[0].id).to.equal(id)
		})
	})

	describe('.bind', () => {

		let db = new EncryptSqlite('password')
		db.query('CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)')

		it('should escape an array of parameters and return itself', () => {
			let stmt = db.prepare('INSERT INTO test (content) VALUES (?)')

			let content = 'te\'st'
			stmt.bind([content])

			let result = stmt.getRow()
			expect(result).to.equal(false)

			result = db.query('SELECT * FROM test')
			expect(result[0].content).to.equal(content)
		})
	})

	describe('.getRow', () => {
		let db = testDb()

		it('should get a row or false if there are no more', () => {
			let stmt = db.prepare('SELECT * FROM test')

			let row = true
			while (row = stmt.getRow()) {
				expect(row).to.be.a('object')
			}

			expect(row).to.equal(false)
		})
	})

	describe('.free', () => {
		let db = testDb()

		it('should free the statement', () => {
			let stmt = db.prepare('SELECT * FROM test')

			stmt.free()

			expect(() => {
				stmt.getRow()
			}).to.throw('Statement closed')
		})
	})
})
