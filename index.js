/**
 * HEP-js: A simple HEP3 Library for Node.JS
 * 
 * Copyright (C) 2015 Lorenzo Mangani (SIPCAPTURE.ORG)
 * Copyright (C) 2015 Alexandr Dubovikov (SIPCAPTURE.ORG)
 * Copyright (C) 2015 QXIP BV (QXIP.NET)
 *
 * Project Homepage: http://github.com/sipcapture 
 *
 * This file is part of HEP-js
 *
 * HEP-js is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 * 
 * HEP-js is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * 
 **/

var debug = false;

module.exports = {
  /**
   * Encode HEP3 Packet from JSON Object.
   *
   * @param  {String} sip_msg
   * @param  {String} hep_json
   * @return {String}
   */
  encapsulate: function(msg,rcinfo) {
	if (debug) console.log('Sending HEP3 Packet...');
	var payload_message = new Buffer(msg);
	var header = new Buffer (6);
	header.write ("HEP3");

	var ip_family = new Buffer (7);
	ip_family.writeUInt16BE(0x0000, 0);
	ip_family.writeUInt16BE(0x0001,2);
	ip_family.writeUInt8(rcinfo.ip_family,6);
	ip_family.writeUInt16BE(ip_family.length,4);

	var ip_proto = new Buffer (7);
	ip_proto.writeUInt16BE(0x0000, 0);
	ip_proto.writeUInt16BE(0x0002, 2);
	ip_proto.writeUInt8(rcinfo.protocol,6);
	ip_proto.writeUInt16BE(ip_proto.length,4);

	/*ip*/
	//var tmpip = inet_pton(rcinfo.srcIp);
	var d = rcinfo.srcIp.split('.');
	var tmpip = ((((((+d[0])*256)+(+d[1]))*256)+(+d[2]))*256)+(+d[3]);

	var src_ip4 = new Buffer (10);
	src_ip4.writeUInt16BE(0x0000, 0);
	src_ip4.writeUInt16BE(0x0003, 2);
	src_ip4.writeUInt32BE(tmpip,6);
	src_ip4.writeUInt16BE(src_ip4.length,4);

	//tmpip = inet_pton(rcinfo.dstIp);
	d = rcinfo.dstIp.split('.');
	tmpip = ((((((+d[0])*256)+(+d[1]))*256)+(+d[2]))*256)+(+d[3]);

	var dst_ip4 = new Buffer (10);
	dst_ip4.writeUInt16BE(0x0000, 0);
	dst_ip4.writeUInt16BE(0x0004, 2);
	dst_ip4.writeUInt32BE(tmpip,6);
	dst_ip4.writeUInt16BE(dst_ip4.length,4);
	
	var src_port = new Buffer (8);
	var tmpA = parseInt(rcinfo.srcPort,10);
	src_port.writeUInt16BE(0x0000, 0);
	src_port.writeUInt16BE(0x0007, 2);
	src_port.writeUInt16BE(tmpA,6);
	src_port.writeUInt16BE(src_port.length,4);

	var dst_port = new Buffer (8);
	tmpA = parseInt(rcinfo.dstPort, 10);
	dst_port.writeUInt16BE(0x0000, 0);
	dst_port.writeUInt16BE(0x0008, 2);
	dst_port.writeUInt16BE(tmpA,6);
	dst_port.writeUInt16BE(dst_port.length,4);

	tmpA = ToUint32(rcinfo.time_sec);
	var time_sec = new Buffer (10);
	time_sec.writeUInt16BE(0x0000, 0);
	time_sec.writeUInt16BE(0x0009, 2);
	time_sec.writeUInt32BE(tmpA,6);
	time_sec.writeUInt16BE(time_sec.length,4);

	tmpA = ToUint32(rcinfo.time_usec);
	var time_usec = new Buffer (10);
	time_usec.writeUInt16BE(0x0000, 0);
	time_usec.writeUInt16BE(0x000a, 2);
	time_usec.writeUInt32BE(tmpA,6);
	time_usec.writeUInt16BE(time_usec.length,4);

	var proto_type = new Buffer (7);
	proto_type.writeUInt16BE(0x0000, 0);
	proto_type.writeUInt16BE(0x000b,2);
	proto_type.writeUInt8(rcinfo.proto_type,6);
	proto_type.writeUInt16BE(proto_type.length,4);

	tmpA = ToUint32(rcinfo.captureId);
	var capt_id = new Buffer (10);
	capt_id.writeUInt16BE(0x0000, 0);
	capt_id.writeUInt16BE(0x000c, 2);
	capt_id.writeUInt32BE(tmpA,6);
	capt_id.writeUInt16BE(capt_id.length,4);

	var auth_chunk = new Buffer (6 + rcinfo.capturePass.length);
	auth_chunk.writeUInt16BE(0x0000, 0);
	auth_chunk.writeUInt16BE(0x000e, 2);
	auth_chunk.write(rcinfo.capturePass,6, rcinfo.capturePass.length);
	auth_chunk.writeUInt16BE(auth_chunk.length,4);

	var payload_chunk = new Buffer (6 + msg.length);
	payload_chunk.writeUInt16BE(0x0000, 0);
	payload_chunk.writeUInt16BE(0x000f, 2);
	payload_chunk.write(msg, 6, msg.length);
	payload_chunk.writeUInt16BE(payload_chunk.length,4);

/*
	hep protocol ::
		chunk_id : 0 //
		chunk_type : 2
		chunk_length : 4
		chunk_data :6 
*/
	var call_state_chunk = new Buffer (6, rcinfo.call_state.length);
	call_state_chunk.writeUInt16BE(0x0000, 0);
	call_state_chunk.writeUInt16BE(0x00f3, 2);
	call_state_chunk.write(rcinfo.call_state, 6, rcinfo.call_state.length);
	call_state_chunk.writeUInt16BE(call_state_chunk.length,4);

	if ((rcinfo.proto_type == 32 || rcinfo.proto_type == 35) && rcinfo.correlation_id.length) {
		
		// create correlation chunk
	        var correlation_chunk = new Buffer (6 + rcinfo.correlation_id.length);
	        correlation_chunk.writeUInt16BE(0x0000, 0);
	        correlation_chunk.writeUInt16BE(0x0011, 2);
	        correlation_chunk.write(rcinfo.correlation_id,6, rcinfo.correlation_id.length);
	        correlation_chunk.writeUInt16BE(correlation_chunk.length,4);
	        
	        tmpA = ToUint16(rcinfo.mos);
		var mos = new Buffer (8);
		mos.writeUInt16BE(0x0000, 0);
		mos.writeUInt16BE(0x0020, 2);
		mos.writeUInt16BE(tmpA,6);
		mos.writeUInt16BE(mos.length,4);
		
		var hep_message = Buffer.concat([
			header, 
			ip_family,
			ip_proto,
			src_ip4,
			dst_ip4,
			src_port,
			dst_port,
			time_sec,
			time_usec,
			proto_type,
			capt_id,
			auth_chunk,
			correlation_chunk,
			call_state_chunk,
			mos
		]);		
		
	}	
	else if (rcinfo.correlation_id.length) {
		
		// create correlation chunk
	        var correlation_chunk = new Buffer (6 + rcinfo.correlation_id.length);
	        correlation_chunk.writeUInt16BE(0x0000, 0);
	        correlation_chunk.writeUInt16BE(0x0011, 2);
	        correlation_chunk.write(rcinfo.correlation_id,6, rcinfo.correlation_id.length);
	        correlation_chunk.writeUInt16BE(correlation_chunk.length,4);
		
		var hep_message = Buffer.concat([
			header, 
			ip_family,
			ip_proto,
			src_ip4,
			dst_ip4,
			src_port,
			dst_port,
			time_sec,
			time_usec,
			proto_type,
			capt_id,
			auth_chunk,
			correlation_chunk,
			payload_chunk
		]);
	}	
	else {

		var hep_message = Buffer.concat([
			header, 
			ip_family,
			ip_proto,
			src_ip4,
			dst_ip4,
			src_port,
			dst_port,
			time_sec,
			time_usec,
			proto_type,
			capt_id,
			auth_chunk,
			payload_chunk,
			call_state
		]);
		
	}
	hep_message.writeUInt16BE(hep_message.length, 4);
	//console.log(hep_message);

	return hep_message;

  },

  encode: function(json) {
    return String(json)
      .toString("binary");
  },

  decode: function(hep) {
    return String(hep)
      .toString('utf8');
  }
};


/* Functions */ 

var modulo = function (a, b) {
        return a - Math.floor(a/b)*b;
}

var ToUint32 = function (x) {
        return modulo(ToInteger(x), Math.pow(2, 32));
}

var ToUint16 = function (x) {
        return modulo(ToInteger(x), Math.pow(2, 16));
}

var ToInteger =function (x) {
        x = Number(x);
        return x < 0 ? Math.ceil(x) : Math.floor(x);
}

var ntohl = function (val) {
    return ((val & 0xFF) << 24)
           | ((val & 0xFF00) << 8)
           | ((val >> 8) & 0xFF00)
           | ((val >> 24) & 0xFF);
}

var inet_pton = function inet_pton(a) {
  
  var r, m, x, i, j, f = String.fromCharCode;
  // IPv4
  m = a.match(/^(?:\d{1,3}(?:\.|$)){4}/);
  if (m) {
    m = m[0].split('.');
    m = f(m[0]) + f(m[1]) + f(m[2]) + f(m[3]);
    // Return if 4 bytes, otherwise false.
    return m.length === 4 ? m : false;
  }
  r = /^((?:[\da-f]{1,4}(?::|)){0,8})(::)?((?:[\da-f]{1,4}(?::|)){0,8})$/;
  // IPv6
  m = a.match(r);
  if (m) {
    // Translate each hexadecimal value.
    for (j = 1; j < 4; j++) {
      // Indice 2 is :: and if no length, continue.
      if (j === 2 || m[j].length === 0) {
        continue;
      }
      m[j] = m[j].split(':');
      for (i = 0; i < m[j].length; i++) {
        m[j][i] = parseInt(m[j][i], 16);
        // Would be NaN if it was blank, return false.
        if (isNaN(m[j][i])) {
          // Invalid IP.
          return false;
        }
        m[j][i] = f(m[j][i] >> 8) + f(m[j][i] & 0xFF);
      }
      m[j] = m[j].join('');
    }
    x = m[1].length + m[3].length;
    if (x === 16) {
      return m[1] + m[3];
    } else if (x < 16 && m[2].length > 0) {
      return m[1] + (new Array(16 - x + 1))
        .join('\x00') + m[3];
    }
  }
  // Invalid IP.
  return false;
}



/*
   Appendix A: HEP3 JSON Format (prototype)
*/

/*
var hepPacket = {
       "type": "HEP",
       "version": 3,
       "protocolFamily": 2,
       "protocol": 17,
       "srcIp": "192.168.3.12",
       "srcPort": 5060,
       "dstIp": "192.168.3.11",
       "dstPort": 5060,
       "timestamp": "2015-06-11T12:36:08:222Z",
       "timestampUSecs": 0,
       "captureId": 241,
       "capturePass": "myHep",
       "vendorChunks": [],
       "payload_type": "SIP",
       "payload": {
           "data": "INVITE sip:9999@homer SIP/2.0\r\n..."
       }
   };

*/
