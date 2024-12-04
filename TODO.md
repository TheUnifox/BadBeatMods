# TODO
## High Priority
- [x] add github auth, add discord link for dms... bot???
- [x] add mod approval queue?? (or other solution for maps turning unverified with anyy changes)
- [ ] bsmods api compatibility maybe (for mod assistant) (this is now required)
- [x] Figure out duplicate version detection
- [ ] make beatmods scraper or something (needs to happen befoe 27th to allow 2 days of scraping.)
- [ ] Double check every POST/PATCH request for duplicate value checking
- [ ] Handle dependcy resolution in API 

## Medium Priority
- [ ] actually serve mods
- [ ] add webhooks (make this public????)
- [ ] add mod filtering to /api/mods
- [ ] Make mod management endpoints
- [ ] Make admin endpoints
- [ ] Move Config management to static class 

## Low Priority
- [ ] Make per game permissions (add to User class)
- [ ] frontend (maybe)
- [ ] Allow only uploading single dll (autopackage into zip)

## Outdated & Done
- [x] Make game agnostic (add property to Mod class)
- [x] fix crash on missing file 