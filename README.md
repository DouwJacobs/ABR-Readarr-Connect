## ABR-Readarr-Connect

Small webhook service that connects AudioBookRequest to Readarr. When a user adds a book in AudioBookRequest, it sends a webhook to this service, which looks up the book and adds/monitors it in Readarr and (optionally) triggers a search.

### How it works
- AudioBookRequest posts to this service at `/webhook/readarr` with a JSON body containing `bookTitle` and `bookAuthors`.
- The service searches Readarr by free text, derives identifiers, and calls the Readarr API to add/monitor the book.
- If `READARR_SEARCH_ON_ADD=true`, the service triggers a search in Readarr right after adding/monitoring.

### Requirements
- Node.js 20+
- A running Readarr instance reachable by this service

### Environment variables
| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `READARR_URL` | yes | | Base URL of your Readarr (e.g. https://readarr.example.com) |
| `READARR_API_KEY` | yes | | API key from Readarr |
| `ROOT_FOLDER_PATH` | yes | | Path to the Readarr root folder to add books into |
| `QUALITY_PROFILE_ID` | no | `2` | Readarr quality profile id |
| `METADATA_PROFILE_ID` | no | `1` | Readarr metadata profile id |
| `READARR_SEARCH_ON_ADD` | no | `false` | If `true`, triggers search after add/monitor |
| `PORT` | no | `3000` | Service port |

### Run locally
```bash
npm install
npm run dev
# POST to the webhook
curl -X POST http://localhost:3000/webhook/readarr \
  -H "Content-Type: application/json" \
  -d '{
    "bookTitle": "The Hobbit",
    "bookAuthors": "J.R.R. Tolkien"
  }'
```

### Docker (development)
```bash
docker compose -f docker-compose.dev.yml up --build
```

### Docker (production image)
```bash
docker build -t abr-readarr-connect .
docker run -p 3000:3000 \
  -e READARR_URL=https://readarr.example.com \
  -e READARR_API_KEY=... \
  -e ROOT_FOLDER_PATH=/data/books \
  -e QUALITY_PROFILE_ID=2 \
  -e METADATA_PROFILE_ID=1 \
  -e READARR_SEARCH_ON_ADD=true \
  abr-readarr-connect
```

### Configure AudioBookRequest webhook
In AudioBookRequest, configure a notification/webhook to point to this service:
- Method: POST
- URL: `http://<host>:3000/webhook/readarr`
- Body (JSON):
```json
{
  "bookTitle": "{bookTitle}",
  "bookAuthors": "{bookAuthors}",
  "eventUser": "{eventUser}"
}
```

Refer to the AudioBookRequest project for deployment and configuration details: [AudioBookRequest on GitHub](https://github.com/markbeep/AudioBookRequest).

### Health check
- `GET /health` returns a small JSON payload indicating service status and configured values (no secrets).

### Acknowledgements
- AudioBookRequest: [github.com/markbeep/AudioBookRequest](https://github.com/markbeep/AudioBookRequest)
- Readarr API structure inspiration and types adapted from: [github.com/jabloink/seerr (feat-readarr branch)](https://github.com/jabloink/seerr/tree/feat-readarr)


