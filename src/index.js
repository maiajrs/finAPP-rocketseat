const express = require('express');
const {v4: uuidV4} = require('uuid')

const app = express();
app.use(express.json());

const customers = [];

function verifyIfExistAccountCPF(request, response, next) 
{
    const {cpf} = request.headers
    const customer = customers.find((customer) => customer.cpf === cpf);

    if(!customer)
    {
        return response.status(404).json({message: "usuário não encontrado."});
    }
    request.customer = customer;
    return next();
}

function varifyIfUserHasBalance(request, response, next) 
{   const {amount} = request.body
    const {customer} = request

    const deposits = customer.statement.filter((statement) => statement.type === "credit").reduce((acc, statement) => acc + statement.amount, 0);
    const withdraws = customer.statement.filter((statement) => statement.type === "withdraw").reduce((acc, statement) => acc + statement.amount, 0);
    const hasBalance = (deposits - (withdraws + amount)) >= 0;
    
    if(!hasBalance)
    {
        return response.status(404).json({error: "customer hasn't balance"});
    }

    return next();
}

app.get("/statement", verifyIfExistAccountCPF, (request, response) => {
    const {customer} = request;
    response.status(200).json({
        statement: customer.statement
       
    })
})

app.post("/account", (request, response) => {
    const {name, cpf} = request.body;

    const customerAlredyExists = customers.some((custumer) => custumer.cpf === cpf);

    if(customerAlredyExists) {
        return response.status(400).json({message: "Este CPF já está cadastrado."})
    }

    customers.push({
        name, 
        cpf, 
        id: uuidV4(),
        statement: []
    });
    response.status(201).send("registro inserido com sucesso.");
});

app.post("/deposit", verifyIfExistAccountCPF, (request, response) => 
{
    const {amount, description} = request.body;
    const {customer} = request;
    

    const statementTransaction = {
        description,
        amount,
        type: "credit",
        createdAt: new Date()
    }
    customer.statement.push(statementTransaction);
    
    return response.status(201).json({message: "success", oparation: "credit"});

})

app.post("/withdraw", verifyIfExistAccountCPF, varifyIfUserHasBalance, (request, response) => 
{
    const {amount, description} = request.body;
    const {customer} = request;

    const statementTransaction = {
        description,
        amount,
        type: "withdraw",
        createdAt: new Date()
    }

    customer.statement.push(statementTransaction);
    return response.status(201).json({message: "success", eperation: "withdraw"});

})

app.get("/statement/date", verifyIfExistAccountCPF, (request, response) => {
    const {customer} = request;
    const {date} = request.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter((statement) => statement.createdAt.toDateString() === dateFormat.toDateString());
    return response.status(200).json({statement});
})

app.put("/account", verifyIfExistAccountCPF, (request, response) => {
    const {name} = request.body;
    const {customer} = request;

    customer.name = name;

    return response.status(200).send();
});

app.get("/account", verifyIfExistAccountCPF, (request, response) => {
    const {customer} = request;

    return response.status(200).json(customer);
});

app.delete("/account", verifyIfExistAccountCPF, (request, response) => {
    const {customer} = request;

    customers.splice(customer, 1);
    

    return response.status(200).send();
});

app.get("/balance", verifyIfExistAccountCPF, (request, response) => {
    const {customer} = request;

    const balance = customer.statement.reduce((acc, next) => {
        if(next.type === "credit") {
            return acc + next.amount;
        } else {
            return acc - next.amount;
        }
    },0)

    return response.status(200).json({balance, statements: customer.statement});
});



app.listen(3333, () => console.log("server is running."));