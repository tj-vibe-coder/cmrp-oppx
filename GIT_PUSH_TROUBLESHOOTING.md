# Git Push Troubleshooting: "Repository not found"

Your commit was successful locally (`fd583f3`). Push failed with:
```
remote: Repository not found.
fatal: repository 'https://github.com/cmrpsupport/cmrp-oppx.git/' not found
```

## Likely causes

1. **Repository doesn't exist** at `https://github.com/cmrpsupport/cmrp-oppx`
2. **Private repo** – credentials in macOS Keychain don't have access to this repo
3. **Wrong org/repo** – typo or repo moved (e.g. different org or renamed repo)
4. **Auth** – GitHub no longer accepts account password for git; use a **Personal Access Token (PAT)** or **SSH**

---

## Step 1: Confirm the repo in the browser

1. Open: https://github.com/cmrpsupport/cmrp-oppx  
2. If you get 404, the repo doesn’t exist or you lack access.  
3. If you see the repo, copy the correct clone URL from the green "Code" button.

---

## Step 2: Fix authentication (HTTPS)

GitHub requires a **Personal Access Token** instead of your account password.

1. **Create a token**
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - "Generate new token (classic)"
   - Name it (e.g. `cmrp-oppx push`)
   - Enable scope: **repo**
   - Generate and copy the token

2. **Use the token when pushing**
   - Run: `git push origin main`
   - When prompted for **password**, paste the token (not your GitHub password)
   - To store it:  
     `git config --global credential.helper osxkeychain`  
     (You already use osxkeychain; next `git push` will offer to save the token.)

3. **If the wrong credentials are cached**
   - Open **Keychain Access**
   - Search for `github.com`
   - Delete or edit the "internet password" for `github.com`
   - Run `git push origin main` again and sign in with the PAT when asked.

---

## Step 3: Try SSH instead of HTTPS

If you use SSH keys with GitHub, you can switch the remote to SSH:

```bash
git remote set-url origin git@github.com:cmrpsupport/cmrp-oppx.git
git push origin main
```

- **No SSH key yet:** GitHub → Settings → SSH and GPG keys → New SSH key, then add your `~/.ssh/id_ed25519.pub` (or `id_rsa.pub`).
- **"Permission denied"** usually means this GitHub account doesn’t have access to `cmrpsupport/cmrp-oppx` or the key isn’t added to that account.

---

## Step 4: Fix the remote URL

If the repo lives elsewhere (e.g. different org or name):

```bash
# See current remote
git remote -v

# Point origin at the correct repo (replace with your real URL)
git remote set-url origin https://github.com/OWNER/REPO.git
# or
git remote set-url origin git@github.com:OWNER/REPO.git

git push origin main
```

---

## Step 5: Verify access

- **Org repo:** You need at least **write** access to `cmrpsupport/cmrp-oppx`.
- **Your fork:** If you’re really pushing to a fork, use your fork’s URL, e.g.  
  `https://github.com/YOUR_USERNAME/cmrp-oppx.git`  
  and keep `cmrpsupport/cmrp-oppx` as `upstream` if you use one.

---

## Quick checklist

- [ ] Repo `https://github.com/cmrpsupport/cmrp-oppx` loads in the browser when you’re logged in
- [ ] You have write access (member of org or repo collaborator)
- [ ] You use a **Personal Access Token** (not password) for HTTPS, or use SSH with a key added to GitHub
- [ ] Remote URL is correct: `git remote -v`
- [ ] No bad credentials for `github.com` in Keychain (or you’ve updated them to a valid PAT)

---

## Push again after fixing

```bash
cd /Users/tjc/OppX/cmrp-oppx
git push origin main
```

Your latest commit is `fd583f3` and is safe locally until you push.
