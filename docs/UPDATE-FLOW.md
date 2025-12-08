# In-App Update Flow

## How Self-Update Works (Solving the Paradox)

### The Challenge
When a Docker container tries to update itself, it faces a paradox:
- The container needs to recreate itself
- But recreating kills the container
- How does the update complete?

### The Solution
We use a **"detached process on host"** approach:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "Update Now"                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Backend receives request                                 │
│    - Validates user is admin                                │
│    - Checks INSTALL_DIR is set                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Send HTTP 200 response IMMEDIATELY                       │
│    ✓ User gets confirmation                                 │
│    ✓ Connection closed                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Wait 3 seconds (ensure response fully sent)              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Spawn DETACHED process via Docker socket                 │
│    Command: docker pull && docker compose up -d             │
│    - Process runs on HOST, not in container                 │
│    - Detached = survives parent death                       │
│    - Unref = doesn't block container shutdown               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Container continues running (for now)                    │
│    - User sees "Update started" message                     │
│    - Frontend starts polling /api/system/health             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Docker (on HOST) pulls new image                         │
│    - This happens OUTSIDE the container                     │
│    - Takes 10-30 seconds depending on connection            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Docker Compose recreates container                       │
│    - Stops old container (kills our process)                │
│    - Removes old container                                  │
│    - Creates new container with new image                   │
│    - Starts new container                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. New container starts                                     │
│    - Database migrations run automatically                  │
│    - Application starts with new version                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Frontend detects update complete                        │
│     - Health endpoint returns new version                   │
│     - Shows "Update complete" message                       │
│     - Auto-reloads page after 2 seconds                     │
└─────────────────────────────────────────────────────────────┘
```

## Key Technical Details

### Why Detached Process Works

```javascript
const updateProcess = spawn('sh', ['-c', 'docker pull && docker compose up -d'], {
  detached: true,  // Process survives parent death
  stdio: 'ignore'  // Don't inherit stdin/stdout/stderr
});

updateProcess.unref();  // Don't keep parent alive
```

**What happens:**
1. `spawn()` creates a child process
2. `detached: true` makes it independent from parent
3. `stdio: 'ignore'` prevents blocking on I/O
4. `unref()` allows parent to exit without waiting
5. Process continues on HOST even after container dies

### Why Docker Socket is Required

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

This mounts the Docker daemon socket into the container, allowing:
- Container to send commands to Docker on the HOST
- Commands execute on HOST, not in container
- HOST continues executing even if container dies

### Timeline

```
T+0s:   User clicks "Update Now"
T+0s:   Backend sends response
T+3s:   Backend spawns detached update process
T+5s:   Docker starts pulling new image
T+20s:  Image pull complete
T+21s:  Docker stops old container (we die here)
T+22s:  Docker creates new container
T+25s:  New container starts
T+30s:  Application ready
T+32s:  Frontend detects new version
T+34s:  Page auto-reloads
```

## Requirements

### Docker Compose Configuration

```yaml
nodedrop:
  image: ghcr.io/node-drop/nodedrop:latest
  environment:
    - INSTALL_DIR=/host-compose  # Path to docker-compose.yml
    - CONTAINER_NAME=nodedrop
    - IMAGE_NAME=ghcr.io/node-drop/nodedrop:latest
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock  # Required for updates
    - .:/host-compose:ro  # Mount compose file location
  # Note: No user restriction (needs Docker socket access)
```

### Security Considerations

**Risks:**
- Container has full Docker access on host
- Could potentially control other containers
- Requires running without user restrictions

**Mitigations:**
- Only admins can trigger updates
- Update endpoint is authenticated
- Docker socket is only used for self-update
- Alternative: Disable feature and use manual updates

**To Disable In-App Updates:**
```yaml
# Add user restriction
user: "1001:1001"

# Remove Docker socket mount
# volumes:
#   - /var/run/docker.sock:/var/run/docker.sock
```


## Troubleshooting

### Update Fails Silently

**Check logs:**
```bash
docker logs nodedrop
```

**Common causes:**
- Docker socket not mounted
- No write access to socket
- User restrictions preventing Docker access

### Container Doesn't Restart

**Check if update process started:**
```bash
# On host, check for docker processes
ps aux | grep docker
```

**Manual recovery:**
```bash
docker-compose pull
docker-compose up -d --force-recreate
```

### Frontend Doesn't Detect Update

**Check health endpoint:**
```bash
curl http://localhost:5678/api/system/health
```

**Manual refresh:**
- Just reload the page
- Frontend polling will eventually timeout and prompt manual refresh

## Testing

### Test Update Flow

1. **Start with old version:**
   ```bash
   docker-compose up -d
   ```

2. **Trigger update from UI:**
   - Login as admin
   - Click user menu → "Check for Updates"
   - Click "Update Now"

3. **Monitor logs:**
   ```bash
   docker-compose logs -f nodedrop
   ```

4. **Verify new version:**
   ```bash
   curl http://localhost:5678/api/system/health
   ```

### Test Without Docker Socket

Remove socket mount and verify graceful error:
```yaml
# volumes:
#   - /var/run/docker.sock:/var/run/docker.sock
```

Should show: "In-app updates require Docker socket access"

## Future Improvements

- [ ] Pre-update validation (disk space, backup check)
- [ ] Rollback capability (keep previous image)
- [ ] Update progress indicator (streaming logs)
- [ ] Scheduled updates (cron-like)
- [ ] Update notifications (email/webhook)
- [ ] Multi-stage updates (blue-green deployment)
