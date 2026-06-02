/* api.js — thin fetch wrappers for the backend REST API.
   All functions return the parsed JSON body (or throw on non-2xx). */
(function () {
  const BASE = 'http://localhost:8081/api';

  async function req(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + path, opts);
    if (!res.ok) throw new Error('API ' + res.status + ' ' + path);
    // 204 No Content — return null
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  window.Api = {
    // Sessions
    createSession: () => req('POST', '/sessions'),
    joinSession: (code, playerName) => req('POST', '/sessions/' + code + '/join', { playerName }),
    startSession: (code) => req('POST', '/sessions/' + code + '/start'),
    getState: (code) => req('GET', '/sessions/' + code + '/state'),

    // Rooms
    completeRoom: (code, roomId) =>
      req('POST', '/sessions/' + code + '/rooms/' + roomId + '/complete'),
    submitAction: (code, roomId, playerName, selectedActionId) =>
      req('POST', '/sessions/' + code + '/rooms/' + roomId + '/submit', { playerName, selectedActionId }),
    requestHint: (code, roomId, playerName) =>
      req('POST', '/sessions/' + code + '/rooms/' + roomId + '/hint', { playerName }),
    beginInvestigation: (code, roomId, playerName) =>
      req('POST', '/sessions/' + code + '/rooms/' + roomId + '/begin', { playerName }),
    recordEvidenceView: (code, roomId, playerName, evidenceTitle) =>
      req('POST', '/sessions/' + code + '/rooms/' + roomId + '/evidence/view', { playerName, evidenceTitle }),

    // Player approval
    approvePlayer: (code, playerName) => req('POST', '/sessions/' + code + '/players/' + encodeURIComponent(playerName) + '/approve'),
    declinePlayer: (code, playerName) => req('POST', '/sessions/' + code + '/players/' + encodeURIComponent(playerName) + '/decline'),

    // Activity & report
    getActivity: (code) => req('GET', '/sessions/' + code + '/activity'),
    getReport: (code) => req('GET', '/sessions/' + code + '/report'),
  };
})();
