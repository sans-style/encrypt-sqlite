const sqljs = require('sql.js')
const nacl = require('tweetnacl')

if (typeof btoa != 'function') {
	var btoa = require('btoa')
}

if (typeof atob != 'function') {
	var atob = require('atob')
}

module.exports = function(password, buffer) {
	var self = this

	if (password == undefined)
		throw TypeError('First paramater should be a password.')

	self.nonce = nacl.randomBytes(24)

	{
		let buffer = new Uint8Array(password.length)

		for (let i=0, strlen = password.length; i < strlen; i++) {
			buffer[i] = password.charCodeAt(i)
		}

		self.dbKey = nacl.hash(buffer).subarray(0, 32)
	}

	if (typeof buffer != 'undefined') {
		buffer = new Uint8Array(atob(buffer).split('').map(function (char) {
			return char.charCodeAt(0)
		}))

		buffer = nacl.secretbox.open(buffer.subarray(24), buffer.subarray(0, 24), self.dbKey)

		self.db = new sqljs.Database(buffer)
	} else {
		self.db = new sqljs.Database()
	}

	self.query = function(query, parameters) {
		if (parameters == undefined)
			parameters = []

		return self.prepare(query).bind(parameters).getResults()
	}

	self.prepare = function(query) {
		return new function(db, query) {
			var self = this

			self.query = query
			self.db = db
			self.stmt = self.db.db.prepare(query)
			self.writeQuery = false
			self.writeBit = false

			if (self.query.match(/^\s*(explain\s*(query\s*plan)?)?(alter|commit|create|delete|drop|insert|pragma|replace|update|vacuum)/i) !== null) {
				self.writeQuery = true
			}

			self.bind = function(parameters) {
				self.stmt.reset()
				self.stmt.bind(parameters)
				if (self.writeQuery) {
					self.writeBit = true
				}

				return self
			}

			self.getRow = function() {
				if (!self.stmt.step())
					return false

				if (self.writeBit) {
					self.writeBit = false
					self.db.write()
				}

				return self.stmt.getAsObject()
			}

			self.getResults = function(parameters) {
				if (parameters != undefined)
					self.bind(parameters)

				let results = []
				while (self.stmt.step()) {
					results.push(self.stmt.getAsObject())
				}

				if (self.writeBit) {
					self.writeBit = false
					self.db.write()
				}

				return results
			}

			self.free = function() {
				self.stmt.free()
			}
		}(self, query)
	}

	self.export = function() {
		let bin = this.db.export()

		self.nonce = nacl.hash(self.nonce).subarray(0, 24)

		bin = nacl.secretbox(bin, self.nonce, self.dbKey)

		let buffer = new Uint8Array(self.nonce.length + bin.length)
		buffer.set(self.nonce)
		buffer.set(bin, self.nonce.length)

		return btoa(String.fromCharCode.apply(null, buffer))
	}

	self.events = {}
	self.on = function(eventName, callback) {
		if (typeof self.events[eventName] == 'undefined') {
			self.events[eventName] = []
		}

		self.events[eventName].push(callback)
	}

	self.call = function(eventName, data) {
		if (typeof self.events[eventName] != 'undefined') {
			self.events[eventName].forEach(function(callback) {
				callback(data)
			})
		}
	}

	self.write = function() {
		self.call('write', self.export())
	}

	self.close = function() {
		self.write()
		self.db.close()
	}
}
