# TODO
## Database Changes
These need to take a priority before deployment due to the potential for a databasse structure change.  
- [ ] (H) Validate that Approval Workflow is good.
- [x] (M) Make per game permissions (add to User class)
- [x] (L) Download Counts

## High Priority
- [ ] Handle Approval
- [ ] Handle Mod Creation
- [ ] Handle Approval revocation
- [ ] Check ALL endpoints for Multi-Game support
- [ ] Double check every POST/PATCH request for duplicate value checking
- [x] Handle dependency resolution in Database 

## Medium Priority
- [ ] add webhooks (make this public????)
- [x] add mod filtering to /api/mods
- [ ] Make mod management endpoints
- [ ] Make admin endpoints
- [ ] do not hardcode games in an enum

## Low Priority
- [ ] frontend (maybe)
- [ ] Allow only uploading single dll (autopackage into zip)
- [ ] do more with the discord bot

## Outdated & Done
- [x] Move Config management to static class 
- [x] Add game filter to mod endpoints
- [x] actually serve mods
- [x] Update all SemVer checks to use SemVer.raw
- [x] Model.find is a query to the database. Need to make sure that its not overused, and cached when appropriate.
- [x] Fix importer causing MA/BeatMods Endpoint crashing
- [x] Require mod versions to never have the same version number (e.g. 1.0.0 and 1.0.0 is not allowed, but 1.0.0 and 1.0.0+1.29.1 is allowed)
- [ ] move `validateSession` to middleware???
- [x] Make game agnostic (add property to Mod class)
- [x] fix crash on missing file 

- [x] add github auth, add discord link for dms... bot???
- [x] add mod approval queue?? (or other solution for maps turning unverified with anyy changes)
- [x] bsmods api compatibility maybe (for mod assistant) (this is now required)
- [x] Figure out duplicate version detection
- [x] make beatmods scraper or something (needs to happen befoe 27th to allow 2 days of scraping.)
