// Requires
const axios = require('axios').default
const base64 = require('base-64')
const utf8 = require('utf8')
const fs = require('fs')
const qs = require('qs')

// Envars (clip url trailing slashes)
const CLIENT_ID = process.env.CMNSRV_CLIENTID
const CLIENT_SECRET = process.env.CMNSRV_CLIENTSECRET
const TOKEN_URL = process.env.KEYCLOAK_OIDC_ENDPOINT.replace(/\/$/, '');
const CDOGS_URL = process.env.CS_CDOGS_ENDPOINT.replace(/\/$/, '');
const CONTEXTS = process.env.PATH_CONTEXTS
const TEMPLATE = process.env.PATH_TEMPLATE
const OUTPUT = process.env.PATH_OUTPUT

// Get token
function get_docgen_token() {
    const params = qs.stringify({
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "scope": ""
    })

    const header = {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    }

    return new Promise(resolve => {
        axios
            .post(TOKEN_URL, params, header)
            .then(res => { resolve(res.data.access_token) })
            .catch(err => { console.error(err) })
    })
}

// Health check
function apiGet(url, headers) {
    return new Promise(resolve => {
        axios
            .get(url, headers)
            .then(res => { resolve(res) })
            .catch(err => { console.error(err.response.data, url) })
    })
}

// Accepts a data dict and a path to an xlsx template and makes a request to CDOGS.
// Returns the response content object that can be added to a starlette.responses.Response.
async function docgen_export_to_xlsx(data, template_path, report_name) {

    // Get auth token and prepare it as an Authorization: Bearer <token> header.
    const token = await get_docgen_token()
    const auth_header = "Bearer " + token

    // Open up the Excel template, and base64 encode it for the docgen endpoint
    const template_data = fs.readFileSync(template_path, 'utf8')
    const bytes = utf8.encode(template_data)
    const base64_encoded = base64.encode(bytes)

    // The docgen endpoint accepts the following schema:
    const body = {
        "data": data,
        "options": {
            "reportName": report_name,
        },
        "template": {
            "encodingType": "base64",
            "content": "base64_encoded",
            "fileType": "xlsx"
        }
    }

    // Authentication in header
    const headers = {
        headers: {
            "Authorization": auth_header,
            "Content-Type": "application/json"
        }
    }

    // Health and file type checks
    console.log((await apiGet(CDOGS_URL + "/health", headers)).statusText)
    console.log((await apiGet(CDOGS_URL + "/fileTypes", headers)).data.dictionary)

    // axios
    //     .post(CDOGS_URL, body, headers)
    //     .then(res => {
    //         resolve(res)
    //     })
    //     .catch(error => {
    //         console.error(error)
    //     })
}
const data = JSON.parse(fs.readFileSync(CONTEXTS, 'utf8'))
docgen_export_to_xlsx(data, TEMPLATE, OUTPUT)
