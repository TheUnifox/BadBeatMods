# TODO
## Database Changes
These need to take a priority before deployment due to the potential for a databasse structure change.  
- [ ] (H) Validate that Approval Workflow is good.
- [ ] (M) Make per game permissions (add to User class)
- [x] (L) Download Counts

## High Priority
- [ ] Double check every POST/PATCH request for duplicate value checking
- [ ] Handle dependency resolution in API 
- [x] Update all SemVer checks to use SemVer.raw
- [ ] Model.find is a query to the database. Need to make sure that its not overused, and cached when appropriate.

## Medium Priority
- [ ] Add game filter to mod endpoints
- [x] actually serve mods
- [ ] add webhooks (make this public????)
- [ ] add mod filtering to /api/mods
- [ ] Make mod management endpoints
- [ ] Make admin endpoints
- [x] Move Config management to static class 

## Low Priority
- [ ] frontend (maybe)
- [ ] Allow only uploading single dll (autopackage into zip)
- [ ] do more with the discord bot
- [ ] move `validateSession` to middleware???

## Outdated & Done
- [x] Make game agnostic (add property to Mod class)
- [x] fix crash on missing file 

- [x] add github auth, add discord link for dms... bot???
- [x] add mod approval queue?? (or other solution for maps turning unverified with anyy changes)
- [x] bsmods api compatibility maybe (for mod assistant) (this is now required)
- [x] Figure out duplicate version detection
- [x] make beatmods scraper or something (needs to happen befoe 27th to allow 2 days of scraping.)
