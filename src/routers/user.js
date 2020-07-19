const express = require('express')
var multer  = require('multer')
const sharp = require('sharp');
const User = require('../models/user')
const auth = require('../middleware/auth')

const router = new express.Router()

router.post('/users', async (req, res)=>{
    const user = new User(req.body)
    try {
        const token = await user.generateAuthToken()
        await user.save()
        res.status(201).send({user, token})
    }catch(e){
        res.status(400).send(e)
    }
})

router.post('/users/login', async (req, res)=>{
    try{
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()          
        res.send({user, token})
    }catch(e){
        res.status(400).send(e)
    }
})
router.post('/users/logout', auth, async (req, res)=>{
    try{
        req.user.tokens = req.user.tokens.filter((token)=>{
            return token.token !== req.token
        })
        await req.user.save()
        res.send()
    }catch(e){
        res.status(500).send()
    }
})

router.post('/users/logoutAll', auth, async (req, res) =>{
    try{
        req.user.tokens = []
        await req.user.save()
        res.status(200).send()
    }catch(e){
        res.status(500).send()
    }
})

router.get('/users/me', auth, async (req, res)=>{
    res.send(req.user)
})


router.patch('/users/me', auth, async (req, res)=>{

    const updates = Object.keys(req.body)
    const availableUpdates = ['name', 'email','age','password']
    const isValidUpdates = updates.every((update)=> availableUpdates.includes(update))

    if(!isValidUpdates){
        res.status(400).send({ "error":"Invalid Updates"})
    }

    try{
       // const user = await User.findById(req.params.id,)
        updates.forEach((update)=> (req.user[update] = req.body[update]))
        await req.user.save()
        res.status(200).send(req.user)
    }catch(e){
        res.status(500).send(e)
    }

})

router.delete('/users/me', auth, async(req, res)=>{
    try{
      await req.user.remove()
      res.send(req.user)
    }catch(e){
        res.status(500).send(e)
    }
})


var avatar = multer({      
        limits :{
            fileSize:1000000
        },
        fileFilter(req, file, cb){
            if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
                return cb(new Error('Invalid file type.'))
            }
            cb(undefined, true)
        }
    })

router.post('/users/me/avatar', auth, avatar.single('avatar'), async function (req, res) {
    const buffer = await sharp(req.file.buffer).resize({width:250, height:250}).png().toBuffer()
    
    req.user.avatar = buffer
    await req.user.save()
    res.send()
}, (error, req, res, next)=>{
    res.status(500).send({error:error.message})
})

router.delete('/users/me/avatar', auth, async function (req, res) {
    try{
        req.user.avatar = undefined
        await req.user.save()
        res.send()
    }catch(e){
        res.status(400).send({error:'Error to delete'})
    }
    
})

router.get('/users/:id/avatar', async function (req, res) {
    try{
        const user = await User.findById(req.params.id)
        if(!user || !user.avatar){
            throw new Error()
        }

       res.set('Content-type', 'image/png')
        res.send(user.avatar)
    }catch(e){
        res.status(404).send()
    }
    
})


module.exports = router